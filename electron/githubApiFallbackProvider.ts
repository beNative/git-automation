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
  options?: { owner?: string; repo?: string; host?: string };
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

const GITHUB_HOSTS = new Set(['github.com', 'api.github.com']);

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

const buildApiHeaders = (instance: ProviderInstance): Record<string, string> => {
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
  if (!instance.computeGithubBasePath || !instance.baseApiUrl) {
    return null;
  }
  const apiPath = instance.computeGithubBasePath(`/repos/${instance.options.owner}/${instance.options.repo}/releases/latest`);
  const apiUrl = newUrlFromBase(apiPath, instance.baseApiUrl as URL);
  const headers = buildApiHeaders(instance);

  if (typeof instance.httpRequest === 'function') {
    try {
      const rawData = await instance.httpRequest(apiUrl, headers, cancellationToken);
      if (!rawData) {
        return null;
      }
      const parsed = JSON.parse(rawData);
      const tag = parsed?.tag_name;
      return typeof tag === 'string' ? tag : null;
    } catch (error) {
      if (typeof fetch !== 'function') {
        throw error;
      }
      // Fall through to fetch below when the provider executor fails.
    }
  }

  if (typeof fetch === 'function') {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const response = await fetch(apiUrl.toString(), {
      headers,
      signal: controller?.signal,
    });
    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }
    const parsed = await response.json();
    const tag = parsed?.tag_name;
    return typeof tag === 'string' ? tag : null;
  }

  return null;
};

const shouldAttemptRestApi = (instance: ProviderInstance): boolean => {
  const host = instance.options?.host?.toLowerCase();
  return !host || GITHUB_HOSTS.has(host);
};

type ApiAttemptContext = 'initial' | 'fallback';

const attemptResolveViaApi = async (
  instance: ProviderInstance,
  cancellationToken: CancellationToken,
  logger: LoggerLike | undefined,
  context: ApiAttemptContext,
): Promise<string | null> => {
  try {
    const tag = await fetchLatestTagFromApi(instance, cancellationToken);
    if (tag) {
      const message = context === 'initial'
        ? '[AutoUpdate] Resolved latest GitHub release via REST API.'
        : '[AutoUpdate] Resolved latest GitHub release via API fallback.';
      tryLog(logger, 'info', message, { tag });
      return tag;
    }
    const emptyMessage = context === 'initial'
      ? '[AutoUpdate] GitHub REST API did not return a tag name; falling back to legacy lookup.'
      : '[AutoUpdate] GitHub API fallback did not return a tag name.';
    tryLog(logger, 'warn', emptyMessage);
    return null;
  } catch (error) {
    const errorMessage = context === 'initial'
      ? '[AutoUpdate] GitHub REST API lookup failed; falling back to legacy lookup.'
      : '[AutoUpdate] GitHub API fallback failed.';
    const level: keyof LoggerLike = context === 'initial' ? 'warn' : 'error';
    tryLog(logger, level, errorMessage, sanitizeError(error));
    if (context === 'fallback') {
      throw error;
    }
    return null;
  }
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
    if (shouldAttemptRestApi(this)) {
      const apiTag = await attemptResolveViaApi(this, cancellationToken, logger, 'initial');
      if (apiTag) {
        return apiTag;
      }
    }

    try {
      return await original.call(this, cancellationToken);
    } catch (error) {
      if (!shouldUseApiFallback(error)) {
        throw error;
      }
      tryLog(logger, 'warn', '[AutoUpdate] Primary GitHub release lookup failed; attempting API fallback.', sanitizeError(error));
      if (!shouldAttemptRestApi(this)) {
        throw error;
      }
      try {
        const tag = await attemptResolveViaApi(this, cancellationToken, logger, 'fallback');
        if (tag) {
          return tag;
        }
      } catch (_apiError) {
        // attemptResolveViaApi already logged the failure; preserve the original error.
      }
      throw error;
    }
  };
};
