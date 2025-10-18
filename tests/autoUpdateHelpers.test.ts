import test from 'node:test';
import assert from 'node:assert/strict';
import type { UpdateDownloadedEvent } from 'electron-updater';
import {
  detectArchFromFileName,
  determineDownloadedUpdateArch,
  extractCandidateNamesFromUpdateInfo,
  filterNamesByArch,
  getFileNameFromUrlLike,
  mapProcessArchToUpdaterArch,
  normalizeNameForComparison,
} from '../electron/autoUpdateHelpers';

test('detectArchFromFileName recognises common Windows architectures', () => {
  assert.equal(detectArchFromFileName('app-setup-x64.exe'), 'x64');
  assert.equal(detectArchFromFileName('app-setup-ia32.exe'), 'ia32');
  assert.equal(detectArchFromFileName('APP-X86.msi'), 'ia32');
  assert.equal(detectArchFromFileName('build-aarch64.zip'), 'arm64');
  assert.equal(detectArchFromFileName('installer-armhf.tar.gz'), 'armv7l');
  assert.equal(detectArchFromFileName('unknown-package.bin'), null);
});

test('mapProcessArchToUpdaterArch normalises Node process architectures', () => {
  assert.equal(mapProcessArchToUpdaterArch('x64'), 'x64');
  assert.equal(mapProcessArchToUpdaterArch('arm'), 'armv7l');
  assert.equal(mapProcessArchToUpdaterArch('arm64'), 'arm64');
  assert.equal(mapProcessArchToUpdaterArch('ppc64' as NodeJS.Process['arch']), null);
});

test('normalizeNameForComparison strips non-alphanumeric characters and lowercases', () => {
  assert.equal(normalizeNameForComparison('Git-Automation_Setup 1.0.0.exe'), 'git-automation-setup-1-0-0-exe');
  assert.equal(normalizeNameForComparison('Example__File!!'), 'example-file');
});

test('getFileNameFromUrlLike handles plain names and URLs with search params', () => {
  assert.equal(getFileNameFromUrlLike('https://example.com/download/app.exe'), 'app.exe');
  assert.equal(getFileNameFromUrlLike('https://example.com/app.exe?download=1'), 'app.exe');
  assert.equal(getFileNameFromUrlLike('plain-file.zip'), 'plain-file.zip');
  assert.equal(getFileNameFromUrlLike(''), null);
});

const createUpdateInfo = (overrides: Partial<UpdateDownloadedEvent>): UpdateDownloadedEvent => ({
  version: '1.2.3',
  files: [],
  downloadedFile: '',
  releaseDate: new Date().toISOString(),
  ...overrides,
} as UpdateDownloadedEvent);

test('extractCandidateNamesFromUpdateInfo aggregates filenames from multiple sources', () => {
  const info = createUpdateInfo({
    files: [
      { url: 'https://example.com/app-ia32.exe' } as any,
      { url: 'https://example.com/app-x64.exe?raw=1' } as any,
    ],
    path: '/tmp/legacy/App-x64.exe',
    downloadedFile: '/tmp/download/app-x64.exe',
  });

  const candidates = extractCandidateNamesFromUpdateInfo(info, '.exe');
  const sorted = [...candidates].sort();
  assert.deepEqual(sorted, ['App-x64.exe', 'app-ia32.exe', 'app-x64.exe']);
});

test('filterNamesByArch prefers matches but falls back when none exist', () => {
  const names = ['app-ia32.exe', 'app-x64.exe'];
  assert.deepEqual(filterNamesByArch(names, 'x64'), ['app-x64.exe']);
  assert.deepEqual(filterNamesByArch(names, 'arm64'), names);
  assert.deepEqual(filterNamesByArch(names, null), names);
});

test('determineDownloadedUpdateArch prioritises metadata that matches the downloaded file', () => {
  const info = createUpdateInfo({
    files: [
      { url: 'https://example.com/app-1.2.3-windows-ia32-setup.exe' } as any,
      { url: 'https://example.com/app-1.2.3-windows-x64-setup.exe' } as any,
    ],
    downloadedFile: '/tmp/app-1.2.3-windows-x64-setup.exe',
  });

  const result = determineDownloadedUpdateArch(info, 'app-1.2.3-windows-x64-setup.exe', 'ia32');
  assert.equal(result.arch, 'x64');
  assert.ok(result.sources.some(source => source.includes('downloadedName')));
  assert.ok(result.sources.some(source => source.includes('info.files')));
});

test('determineDownloadedUpdateArch falls back to process architecture when metadata is missing', () => {
  const info = createUpdateInfo({ downloadedFile: '/tmp/app.exe' });
  const result = determineDownloadedUpdateArch(info, 'app.exe', 'arm');
  assert.equal(result.arch, 'armv7l');
  assert.deepEqual(result.sources, ['process.arch:arm']);
});

test('candidate extraction ignores files with mismatched extensions', () => {
  const info = createUpdateInfo({
    files: [
      { url: 'https://example.com/app.exe' } as any,
      { url: 'https://example.com/app.zip' } as any,
    ],
    downloadedFile: '/tmp/app.exe',
  });

  const candidates = extractCandidateNamesFromUpdateInfo(info, '.exe');
  assert.deepEqual(candidates, ['app.exe']);
});
