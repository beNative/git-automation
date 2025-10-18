import path from 'path';
import type { UpdateDownloadedEvent } from 'electron-updater';

export type UpdaterArch = 'x64' | 'ia32' | 'arm64' | 'armv7l';

export type ArchDetectionResult = { arch: UpdaterArch | null; sources: string[] };

export const mapProcessArchToUpdaterArch = (arch: NodeJS.Process['arch']): UpdaterArch | null => {
  switch (arch) {
    case 'x64':
    case 'arm64':
    case 'ia32':
      return arch;
    case 'arm':
      return 'armv7l';
    default:
      return null;
  }
};

export const detectArchFromFileName = (name: string | null | undefined): UpdaterArch | null => {
  if (!name) {
    return null;
  }
  const normalized = name.toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const hasToken = (token: string) => tokens.includes(token);

  if (hasToken('arm64') || hasToken('aarch64')) {
    return 'arm64';
  }
  if (hasToken('armv7l') || hasToken('armhf')) {
    return 'armv7l';
  }
  if (hasToken('ia32') || hasToken('x86') || hasToken('win32')) {
    return 'ia32';
  }
  if (hasToken('x64') || hasToken('amd64') || hasToken('win64')) {
    return 'x64';
  }

  const endsWith32 = /(^|[^0-9])32($|[^0-9])/.test(normalized);
  const endsWith64 = /(^|[^0-9])64($|[^0-9])/.test(normalized);
  if (endsWith32 && !endsWith64) {
    return 'ia32';
  }
  if (endsWith64 && !endsWith32) {
    return 'x64';
  }
  return null;
};

export const normalizeNameForComparison = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

export const getFileNameFromUrlLike = (input: string): string | null => {
  if (!input) {
    return null;
  }
  try {
    const parsed = new URL(input);
    return path.basename(parsed.pathname);
  } catch (error) {
    const sanitized = input.split('?')[0].split('#')[0];
    if (!sanitized) {
      return null;
    }
    return path.basename(sanitized);
  }
};

export const determineDownloadedUpdateArch = (
  info: UpdateDownloadedEvent,
  downloadedName: string,
  processArch: NodeJS.Process['arch'] = process.arch,
): ArchDetectionResult => {
  type ArchCandidate = { priority: number; sources: string[] };
  const candidates = new Map<UpdaterArch, ArchCandidate>();
  const ensureUnique = (values: string[]): string[] => {
    return Array.from(new Set(values));
  };
  const register = (arch: UpdaterArch | null, priority: number, source: string) => {
    if (!arch) {
      return;
    }
    const existing = candidates.get(arch);
    if (!existing) {
      candidates.set(arch, { priority, sources: [source] });
      return;
    }
    const mergedSources = ensureUnique([...existing.sources, source]);
    if (priority > existing.priority) {
      candidates.set(arch, { priority, sources: mergedSources });
      return;
    }
    existing.sources = mergedSources;
  };

  register(mapProcessArchToUpdaterArch(processArch), 10, `process.arch:${processArch}`);
  register(detectArchFromFileName(downloadedName), 40, `downloadedName:${downloadedName}`);

  if (typeof (info as any).path === 'string') {
    const legacyName = path.basename((info as any).path);
    register(detectArchFromFileName(legacyName), 50, `info.path:${legacyName}`);
  }

  if (Array.isArray(info.files)) {
    for (const file of info.files) {
      if (typeof file?.url !== 'string') {
        continue;
      }
      const urlName = getFileNameFromUrlLike(file.url);
      const arch = detectArchFromFileName(urlName);
      const matchesDownloaded = urlName && normalizeNameForComparison(urlName) === normalizeNameForComparison(downloadedName);
      register(arch, matchesDownloaded ? 100 : 80, urlName ? `info.files:${urlName}` : 'info.files');
    }
  }

  let selected: ArchDetectionResult = { arch: null, sources: [] };
  for (const [arch, candidate] of candidates.entries()) {
    const selectedPriority = selected.arch ? candidates.get(selected.arch)?.priority ?? -Infinity : -Infinity;
    if (!selected.arch || candidate.priority > selectedPriority) {
      selected = { arch, sources: [...candidate.sources] };
    }
  }
  return selected;
};

export const filterNamesByArch = (names: string[], arch: UpdaterArch | null): string[] => {
  if (!arch) {
    return names;
  }
  const filtered = names.filter(name => detectArchFromFileName(name) === arch);
  return filtered.length > 0 ? filtered : names;
};

export const extractCandidateNamesFromUpdateInfo = (
  info: UpdateDownloadedEvent,
  extension: string,
): string[] => {
  const names = new Set<string>();
  const normalizedExt = extension.toLowerCase();
  const considerName = (name: string | null | undefined) => {
    if (!name) {
      return;
    }
    if (!normalizedExt || path.extname(name).toLowerCase() === normalizedExt) {
      names.add(name);
    }
  };

  if (Array.isArray(info.files)) {
    for (const file of info.files) {
      if (typeof file?.url === 'string') {
        considerName(getFileNameFromUrlLike(file.url));
      }
    }
  }

  if (typeof (info as any).path === 'string') {
    considerName(path.basename((info as any).path));
  }

  if (typeof info.downloadedFile === 'string') {
    considerName(path.basename(info.downloadedFile));
  }

  return Array.from(names);
};

export type FileValidationSuccess = {
  success: true;
  filePath: string;
  expectedName: string;
  renamed?: boolean;
  officialNames: string[];
};

export type FileValidationFailure = {
  success: false;
  error: string;
  downloadedName: string;
  officialNames: string[];
};

export type FileValidationResult = FileValidationSuccess | FileValidationFailure;
