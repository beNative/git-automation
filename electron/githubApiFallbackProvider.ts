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

type FallbackSignal = {
  shouldFallback: boolean;
  reason?: 'not-acceptable' | 'not-found';
  statusCode?: number;
  code?: string;
  message?: string;
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

const classifyFallbackSignal = (error: unknown): FallbackSignal => {
  if (!error || typeof error !== 'object') {
    return { shouldFallback: false };
  }
  const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : undefined;
  const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
  const code = typeof (error as any)?.code === 'string' ? (error as any).code : undefined;

  if (statusCode === 406 || (code === 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND' && message.includes('406'))) {
    return { shouldFallback: true, reason: 'not-acceptable', statusCode, code, message };
  }

  if (statusCode === 404 || /404/.test(message)) {
    return { shouldFallback: true, reason: 'not-found', statusCode, code, message };
  }

  return { shouldFallback: false, statusCode, code, message };
};

const buildApiHeaders = (instance: ProviderInstance): Record<string, string> => {
  const existing = instance.requestHeaders && typeof instance.requestHeaders === 'object'
    ? instance.requestHeaders
    : undefined;
  return existing ? { ...existing, ...DEFAULT_FALLBACK_HEADERS } : { ...DEFAULT_FALLBACK_HEADERS };
};

type ApiAttemptOutcome = 'tag-found' | 'no-tag' | 'error';

type ApiAttemptLog = {
  path: string;
  outcome: ApiAttemptOutcome;
  tag?: string;
  error?: SanitizedError;
  payloadSummary?: Record<string, any>;
};

type ApiLookupResult = {
  tag: string | null;
  attempts: ApiAttemptLog[];
  lastError?: unknown;
};

const summarizePayload = (payload: any): Record<string, any> => {
  if (payload == null) {
    return { type: payload === null ? 'null' : typeof payload };
  }
  if (Array.isArray(payload)) {
    const first = payload[0];
    return {
      type: 'array',
      length: payload.length,
      firstKeys: first && typeof first === 'object' ? Object.keys(first).slice(0, 8) : undefined,
    };
  }
  if (typeof payload === 'object') {
    return {
      type: 'object',
      keys: Object.keys(payload).slice(0, 12),
    };
  }
  return { type: typeof payload };
};

const extractTagFromPayload = (payload: any): string | null => {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const nested = extractTagFromPayload(entry);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
  if (typeof payload === 'object') {
    const maybeTag = typeof payload.tag_name === 'string' && payload.tag_name.trim().length > 0
      ? payload.tag_name.trim()
      : typeof payload.name === 'string' && payload.name.trim().length > 0
        ? payload.name.trim()
        : null;
    return maybeTag;
  }
  return null;
};

const computeApiPath = (instance: ProviderInstance, suffix: string): string | null => {
  if (!instance.options?.owner || !instance.options?.repo) {
    return null;
  }
  if (!instance.computeGithubBasePath) {
    return null;
  }
  return instance.computeGithubBasePath(`/repos/${instance.options.owner}/${instance.options.repo}${suffix}`);
};

const requestGithubApiJson = async (
  instance: ProviderInstance,
  apiPath: string,
  cancellationToken: CancellationToken,
): Promise<any> => {
  if (!instance.baseApiUrl) {
    return null;
  }
  const headers = buildApiHeaders(instance);
  const apiUrl = newUrlFromBase(apiPath, instance.baseApiUrl as URL);

  const performFetch = async (): Promise<any> => {
    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available for GitHub API request.');
    }
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const cancelHandler = () => {
      try {
        controller?.abort();
      } catch (_error) {
        // ignore abort errors
      }
    };
    let removeCancelListener: (() => void) | null = null;
    const maybeOnCancel = cancellationToken && typeof (cancellationToken as any).onCancel === 'function'
      ? (cancellationToken as any).onCancel.bind(cancellationToken)
      : null;
    if (controller && maybeOnCancel) {
      maybeOnCancel(cancelHandler);
      removeCancelListener = () => {
        try {
          (cancellationToken as any)?.removeListener?.('cancel', cancelHandler);
        } catch (_error) {
          // ignore listener removal issues
        }
      };
    }

    try {
      const response = await fetch(apiUrl.toString(), {
        headers,
        signal: controller?.signal,
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const body = await response.text();
        const error: any = new Error(`GitHub API responded with ${response.status}`);
        error.statusCode = response.status;
        error.url = apiUrl.toString();
        error.body = body;
        throw error;
      }
      const text = await response.text();
      if (!text || !text.trim()) {
        return null;
      }
      return JSON.parse(text);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message === 'cancelled') {
        const abortError: any = new Error('GitHub API request was aborted.');
        abortError.name = 'AbortError';
        throw abortError;
      }
      throw error;
    } finally {
      removeCancelListener?.();
    }
  };

  let fetchError: unknown = null;
  try {
    return await performFetch();
  } catch (error) {
    fetchError = error;
  }

  if (typeof instance.httpRequest === 'function') {
    try {
      const rawData = await instance.httpRequest(apiUrl, headers, cancellationToken);
      if (rawData && rawData.trim().length > 0) {
        return JSON.parse(rawData);
      }
      return null;
    } catch (error) {
      fetchError = error;
    }
  }

  if (fetchError) {
    throw fetchError;
  }

  return null;
};

const fetchLatestTagFromApi = async (
  instance: ProviderInstance,
  cancellationToken: CancellationToken,
): Promise<ApiLookupResult> => {
  const attempts: ApiAttemptLog[] = [];

  const latestPath = computeApiPath(instance, '/releases/latest');
  const listPath = computeApiPath(instance, '/releases?per_page=1');

  if (!latestPath || !listPath) {
    return { tag: null, attempts };
  }

  let lastError: unknown = null;
  const paths = [latestPath, listPath];

  for (const path of paths) {
    try {
      const payload = await requestGithubApiJson(instance, path, cancellationToken);
      const tag = extractTagFromPayload(payload);
      if (tag) {
        attempts.push({ path, outcome: 'tag-found', tag });
        return { tag, attempts };
      }
      attempts.push({ path, outcome: 'no-tag', payloadSummary: summarizePayload(payload) });
    } catch (error) {
      attempts.push({ path, outcome: 'error', error: sanitizeError(error) });
      lastError = error;
    }
  }

  return { tag: null, attempts, lastError };
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
    const { tag, attempts, lastError } = await fetchLatestTagFromApi(instance, cancellationToken);
    if (tag) {
      const message = context === 'initial'
        ? '[AutoUpdate] Resolved latest GitHub release via REST API.'
        : '[AutoUpdate] Resolved latest GitHub release via API fallback.';
      tryLog(logger, 'info', message, { tag, attempts });
      return tag;
    }
    const emptyMessage = context === 'initial'
      ? '[AutoUpdate] GitHub REST API did not return a tag name; falling back to legacy lookup.'
      : '[AutoUpdate] GitHub API fallback did not return a tag name.';
    tryLog(logger, 'warn', emptyMessage, attempts.length ? { attempts } : undefined);
    if (context === 'fallback' && lastError) {
      throw lastError;
    }
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
      const fallbackSignal = classifyFallbackSignal(error);
      if (!fallbackSignal.shouldFallback) {
        throw error;
      }
      const sanitized = sanitizeError(error);
      const logMessage = fallbackSignal.reason === 'not-found'
        ? '[AutoUpdate] Primary GitHub release lookup returned 404; release metadata may be missing latest*.yml. Attempting API fallback.'
        : '[AutoUpdate] Primary GitHub release lookup failed; attempting API fallback.';
      tryLog(logger, 'warn', logMessage, { ...sanitized, fallbackSignal });
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
