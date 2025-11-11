import { GitHubProvider } from 'electron-updater/out/providers/GitHubProvider';
import { newUrlFromBase } from 'electron-updater/out/util';
import type { CancellationToken } from 'builder-util-runtime';
import type { URL } from 'url';

type LoggerLike = {
  debug?: (message: string, data?: any) => void;
  info?: (message: string, data?: any) => void;
  warn?: (message: string, data?: any) => void;
  error?: (message: string, data?: any) => void;
};

type ProviderInstance = {
  options?: { owner?: string; repo?: string };
  baseApiUrl?: URL;
  httpRequest?: (url: URL, headers: Record<string, string>, token: CancellationToken) => Promise<string>;
  computeGithubBasePath?: (path: string) => string;
  requestHeaders?: Record<string, string>;
};

type SanitizedError = {
  message?: string;
  stack?: string;
  statusCode?: number;
  code?: string;
};

const DEFAULT_FALLBACK_HEADERS: Record<string, string> = {
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'GitAutomationDashboard-Updater',
  'X-GitHub-Api-Version': '2022-11-28',
};

const patchSymbol = Symbol.for('git-automation.githubProviderPatched');

const tryLog = (logger: LoggerLike | undefined, level: keyof LoggerLike, message: string, data?: any) => {
  const fn = logger?.[level];
  if (typeof fn === 'function') {
    try {
      fn.call(logger, message, data);
    } catch (error) {
      const fallback = level === 'error' ? console.error : console.warn;
      fallback?.('Failed to log auto-update message.', error);
    }
  }
};

const sanitizeError = (error: unknown): SanitizedError => {
  if (!error || typeof error !== 'object') {
    return { message: typeof error === 'string' ? error : String(error) };
  }
  const err = error as Record<string, any>;
  const sanitized: SanitizedError = {};
  if (typeof err.message === 'string') sanitized.message = err.message;
  if (typeof err.stack === 'string') sanitized.stack = err.stack;
  if (typeof err.statusCode === 'number') sanitized.statusCode = err.statusCode;
  if (typeof err.code === 'string') sanitized.code = err.code;
  return sanitized;
};

const shouldUseApiFallback = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : undefined;
  const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
  const code = typeof (error as any)?.code === 'string' ? (error as any).code : undefined;
  if (statusCode === 406) {
    return true;
  }
  if (code === 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND' && message.includes('406')) {
    return true;
  }
  return false;
};

const buildApiFallbackHeaders = (instance: ProviderInstance): Record<string, string> => {
  const existing = instance.requestHeaders && typeof instance.requestHeaders === 'object'
    ? instance.requestHeaders
    : undefined;
  return existing ? { ...existing, ...DEFAULT_FALLBACK_HEADERS } : { ...DEFAULT_FALLBACK_HEADERS };
};

const fetchLatestTagFromApi = async (
  instance: ProviderInstance,
  cancellationToken: CancellationToken,
): Promise<string | null> => {
  if (!instance.options?.owner || !instance.options?.repo) {
    return null;
  }
  if (!instance.computeGithubBasePath || !instance.baseApiUrl || !instance.httpRequest) {
    return null;
  }
  const apiPath = instance.computeGithubBasePath(`/repos/${instance.options.owner}/${instance.options.repo}/releases/latest`);
  const apiUrl = newUrlFromBase(apiPath, instance.baseApiUrl as URL);
  const headers = buildApiFallbackHeaders(instance);
  const rawData = await instance.httpRequest(apiUrl, headers, cancellationToken);
  if (!rawData) {
    return null;
  }
  const parsed = JSON.parse(rawData);
  const tag = parsed?.tag_name;
  return typeof tag === 'string' ? tag : null;
};

export const installGitHubLatestTagFallback = (logger?: LoggerLike): void => {
  const proto = GitHubProvider.prototype as unknown as ProviderInstance & { [patchSymbol]?: boolean; getLatestTagName?: Function };
  if (!proto || proto[patchSymbol]) {
    return;
  }
  const original = proto.getLatestTagName;
  if (typeof original !== 'function') {
    tryLog(logger, 'warn', '[AutoUpdate] Unable to patch GitHubProvider; original getLatestTagName not found.');
    return;
  }
  proto[patchSymbol] = true;
  proto.getLatestTagName = async function patchedGetLatestTagName(this: ProviderInstance, cancellationToken: CancellationToken) {
    try {
      return await original.call(this, cancellationToken);
    } catch (error) {
      if (!shouldUseApiFallback(error)) {
        throw error;
      }
      tryLog(logger, 'warn', '[AutoUpdate] Primary GitHub release lookup failed; attempting API fallback.', sanitizeError(error));
      try {
        const tag = await fetchLatestTagFromApi(this, cancellationToken);
        if (tag) {
          tryLog(logger, 'info', '[AutoUpdate] Resolved latest GitHub release via API fallback.', { tag });
          return tag;
        }
        tryLog(logger, 'warn', '[AutoUpdate] GitHub API fallback did not return a tag name.');
      } catch (apiError) {
        tryLog(logger, 'error', '[AutoUpdate] GitHub API fallback failed.', sanitizeError(apiError));
        throw error;
      }
      throw error;
    }
  };
};
