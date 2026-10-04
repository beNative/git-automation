import path from 'path';

/**
 * Normalizes a selected executable path to be relative to the repository if it's inside repoPath,
 * or keeps it absolute if outside.
 */
export const normalizeExecutablePath = (selectedPath: string, repoPath?: string | null): string => {
  if (!selectedPath) return '';
  if (!repoPath) return selectedPath;

  const normRepo = repoPath.replace(/\\/g, '/').replace(/\/$/, '');
  const normSelected = selectedPath.replace(/\\/g, '/');

  if (normSelected.toLowerCase().startsWith(normRepo.toLowerCase() + '/')) {
    return normSelected.slice(normRepo.length + 1);
  }

  return selectedPath;
};

/**
 * Resolves the full executable path and working directory for launching.
 * Correctly handles relative paths inside repoPath as well as absolute paths.
 */
export const resolveExecutablePath = (
  repoPath: string,
  executablePath: string
): { fullPath: string; cwd: string } => {
  const fullPath = repoPath
    ? (path.isAbsolute(executablePath) ? executablePath : path.resolve(repoPath, executablePath))
    : executablePath;
  const cwd = repoPath || (path.isAbsolute(fullPath) ? path.dirname(fullPath) : process.cwd());
  return { fullPath, cwd };
};
