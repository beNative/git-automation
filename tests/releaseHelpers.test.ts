import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSemver,
  getReleaseTimestamp,
  compareReleases,
  sortGitHubReleases,
  findLatestRelease,
  mapGitHubReleaseToReleaseInfo,
} from '../electron/releaseHelpers';

test('parseSemver correctly parses standard and prefixed semantic versions', () => {
  assert.deepEqual(parseSemver('v0.9.6'), { major: 0, minor: 9, patch: 6, prerelease: undefined });
  assert.deepEqual(parseSemver('1.2.3'), { major: 1, minor: 2, patch: 3, prerelease: undefined });
  assert.deepEqual(parseSemver('v2.0.0-beta.1'), { major: 2, minor: 0, patch: 0, prerelease: 'beta.1' });
  assert.equal(parseSemver('not-a-version'), null);
  assert.equal(parseSemver(''), null);
  assert.equal(parseSemver(null), null);
});

test('getReleaseTimestamp prioritizes published_at then falls back to created_at', () => {
  const published = { published_at: '2026-09-09T08:35:35Z', created_at: '2026-09-09T08:25:25Z' };
  assert.equal(getReleaseTimestamp(published), new Date('2026-09-09T08:35:35Z').getTime());

  const draft = { published_at: null, created_at: '2026-07-21T13:25:10Z' };
  assert.equal(getReleaseTimestamp(draft), new Date('2026-07-21T13:25:10Z').getTime());

  assert.equal(getReleaseTimestamp({}), 0);
  assert.equal(getReleaseTimestamp(null), 0);
});

test('sortGitHubReleases puts newer releases first even when GitHub returns older drafts first', () => {
  // GitHub returns drafts at the front of the list, regardless of their creation/published date
  const gitHubApiOrder = [
    {
      id: 357373286,
      tag_name: 'v0.9.2',
      name: 'DocForge v0.9.2',
      draft: true,
      prerelease: false,
      created_at: '2026-07-21T13:25:10Z',
      published_at: '2026-07-21T13:36:07Z',
    },
    {
      id: 385347226,
      tag_name: 'v0.9.6',
      name: 'DocForge v0.9.6',
      draft: false,
      prerelease: false,
      created_at: '2026-09-09T08:25:25Z',
      published_at: '2026-09-09T08:35:35Z',
    },
    {
      id: 357483174,
      tag_name: 'v0.9.5',
      name: 'DocForge v0.9.5',
      draft: false,
      prerelease: false,
      created_at: '2026-07-21T16:18:47Z',
      published_at: '2026-07-21T16:29:33Z',
    },
  ];

  const sorted = sortGitHubReleases(gitHubApiOrder);
  assert.equal(sorted[0].tag_name, 'v0.9.6');
  assert.equal(sorted[1].tag_name, 'v0.9.5');
  assert.equal(sorted[2].tag_name, 'v0.9.2');
});

test('findLatestRelease returns v0.9.6 instead of the older v0.9.2 draft', () => {
  const releases = [
    {
      id: 357373286,
      tag_name: 'v0.9.2',
      name: 'DocForge v0.9.2',
      draft: true,
      prerelease: false,
      created_at: '2026-07-21T13:25:10Z',
      published_at: '2026-07-21T13:36:07Z',
    },
    {
      id: 385347226,
      tag_name: 'v0.9.6',
      name: 'DocForge v0.9.6',
      draft: false,
      prerelease: false,
      created_at: '2026-09-09T08:25:25Z',
      published_at: '2026-09-09T08:35:35Z',
    },
  ];

  const latest = findLatestRelease(releases, { allowPrerelease: true });
  assert.ok(latest);
  assert.equal(latest.tag_name, 'v0.9.6');
  assert.equal(latest.draft, false);
});

test('findLatestRelease respects allowPrerelease setting', () => {
  const releases = [
    {
      id: 2,
      tag_name: 'v1.1.0-beta.1',
      draft: false,
      prerelease: true,
      created_at: '2026-09-09T10:00:00Z',
      published_at: '2026-09-09T10:00:00Z',
    },
    {
      id: 1,
      tag_name: 'v1.0.0',
      draft: false,
      prerelease: false,
      created_at: '2026-09-01T10:00:00Z',
      published_at: '2026-09-01T10:00:00Z',
    },
  ];

  // When prereleases are allowed, return the beta
  const allowed = findLatestRelease(releases, { allowPrerelease: true });
  assert.equal(allowed?.tag_name, 'v1.1.0-beta.1');

  // When prereleases are disallowed, return the stable release
  const disallowed = findLatestRelease(releases, { allowPrerelease: false });
  assert.equal(disallowed?.tag_name, 'v1.0.0');
});

test('findLatestRelease returns a draft if it is truly the newest release being staged', () => {
  const releases = [
    {
      id: 2,
      tag_name: 'v0.9.7',
      name: 'Staged draft',
      draft: true,
      prerelease: false,
      created_at: '2026-09-10T10:00:00Z',
      published_at: null,
    },
    {
      id: 1,
      tag_name: 'v0.9.6',
      name: 'DocForge v0.9.6',
      draft: false,
      prerelease: false,
      created_at: '2026-09-09T08:25:25Z',
      published_at: '2026-09-09T08:35:35Z',
    },
  ];

  const latest = findLatestRelease(releases, { allowPrerelease: true });
  assert.equal(latest?.tag_name, 'v0.9.7');
  assert.equal(latest?.draft, true);
});

test('mapGitHubReleaseToReleaseInfo produces a valid ReleaseInfo object', () => {
  const info = mapGitHubReleaseToReleaseInfo({
    id: 123,
    tag_name: 'v0.9.6',
    name: 'DocForge v0.9.6',
    body: 'Release notes',
    draft: false,
    prerelease: false,
    html_url: 'https://github.com/beNative/docforge/releases/tag/v0.9.6',
    created_at: '2026-09-09T08:25:25Z',
  });

  assert.deepEqual(info, {
    id: 123,
    tagName: 'v0.9.6',
    name: 'DocForge v0.9.6',
    body: 'Release notes',
    isDraft: false,
    isPrerelease: false,
    url: 'https://github.com/beNative/docforge/releases/tag/v0.9.6',
    createdAt: '2026-09-09T08:25:25Z',
  });
});
