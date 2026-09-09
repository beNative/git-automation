import type { ReleaseInfo } from '../types';

export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export const parseSemver = (tag: string | null | undefined): SemverVersion | null => {
  if (!tag) return null;
  const match = tag.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
};

export const getReleaseTimestamp = (release: any): number => {
  if (!release) return 0;
  // For published releases, published_at is the official release date.
  // For drafts, published_at is null (or legacy if previously published), so created_at is used.
  const dateStr = release.published_at || release.created_at;
  if (!dateStr) return 0;
  const time = new Date(dateStr).getTime();
  return isNaN(time) ? 0 : time;
};

export const compareReleases = (a: any, b: any): number => {
  const dateA = getReleaseTimestamp(a);
  const dateB = getReleaseTimestamp(b);
  if (dateB !== dateA) {
    return dateB - dateA;
  }

  const semA = parseSemver(a?.tag_name);
  const semB = parseSemver(b?.tag_name);
  if (semA && semB) {
    if (semB.major !== semA.major) return semB.major - semA.major;
    if (semB.minor !== semA.minor) return semB.minor - semA.minor;
    if (semB.patch !== semA.patch) return semB.patch - semA.patch;
    // Published/stable releases take precedence over pre-releases with identical version numbers
    if (!semB.prerelease && semA.prerelease) return 1;
    if (semB.prerelease && !semA.prerelease) return -1;
  }

  return (b?.id || 0) - (a?.id || 0);
};

export interface GitHubReleasePayload {
  id?: number;
  tag_name?: string;
  name?: string;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  html_url?: string;
  created_at?: string;
  published_at?: string | null;
  [key: string]: any;
}

export const sortGitHubReleases = <T extends GitHubReleasePayload>(releases: T[]): T[] => {
  if (!Array.isArray(releases)) return [];
  return [...releases].sort(compareReleases);
};

export interface FindLatestReleaseOptions {
  allowPrerelease?: boolean;
}

export const findLatestRelease = <T extends GitHubReleasePayload>(
  releases: T[],
  options?: FindLatestReleaseOptions,
): T | null => {
  if (!Array.isArray(releases) || releases.length === 0) {
    return null;
  }

  const sorted = sortGitHubReleases(releases);

  for (const release of sorted) {
    if (release.draft) {
      return release;
    }
    if (!options?.allowPrerelease && release.prerelease) {
      continue;
    }
    return release;
  }

  return null;
};

export const mapGitHubReleaseToReleaseInfo = (release: any): ReleaseInfo => {
  return {
    id: release.id,
    tagName: release.tag_name || release.name || 'Draft',
    name: release.name || release.tag_name || 'Untitled Release',
    body: release.body ?? null,
    isDraft: Boolean(release.draft),
    isPrerelease: Boolean(release.prerelease),
    url: release.html_url || '',
    createdAt: release.created_at || new Date().toISOString(),
  };
};
