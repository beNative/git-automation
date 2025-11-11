import test from 'node:test';
import assert from 'node:assert/strict';
import { URL } from 'url';
import { CancellationToken } from 'builder-util-runtime';
import { GitHubProvider } from 'electron-updater/out/providers/GitHubProvider';
import { installGitHubLatestTagFallback } from '../electron/githubApiFallbackProvider';

const patchSymbol = Symbol.for('git-automation.githubProviderPatched');

type RecordedRequest = { url: string; headers: Record<string, string> };

type StubProvider = {
  recordedRequests: RecordedRequest[];
  options: { owner: string; repo: string; host?: string };
};

type ApiResponseQueueItem = string | null | Error | { status: number; body?: string };

type LoggerEntry = { level: 'info' | 'warn' | 'error'; message: string; data?: any };

const createStubProvider = (options?: { httpResponses?: ApiResponseQueueItem[]; host?: string }): StubProvider & any => {
  const recordedRequests: RecordedRequest[] = [];
  const queue: ApiResponseQueueItem[] = [...(options?.httpResponses ?? [JSON.stringify({ tag_name: 'v9.9.9' })])];
  const provider: any = Object.create(GitHubProvider.prototype);
  provider.options = { owner: 'example', repo: 'repo', ...(options?.host ? { host: options.host } : {}) };
  provider.baseApiUrl = new URL('https://api.github.com/');
  provider.computeGithubBasePath = (path: string) => path;
  provider.requestHeaders = { Authorization: 'token example' };
  provider.recordedRequests = recordedRequests;
  provider.httpRequest = async (url: URL, headers: Record<string, string>) => {
    recordedRequests.push({ url: url.toString(), headers });
    if (queue.length === 0) {
      return '';
    }
    const next = queue.shift();
    if (next instanceof Error) {
      throw next;
    }
    if (next && typeof next === 'object' && 'status' in next) {
      if ((next as any).status >= 400) {
        const error: any = new Error(`HTTP ${String((next as any).status)}`);
        error.statusCode = (next as any).status;
        throw error;
      }
      return (next as any).body ?? '';
    }
    return next ?? '';
  };
  return provider;
};

type PatchOptions = {
  fetchResponses?: ApiResponseQueueItem[];
  httpResponses?: ApiResponseQueueItem[];
  host?: string;
  legacyImpl?: (this: any, token: CancellationToken) => any;
  logger?: {
    info?: (message: string, data?: any) => void;
    warn?: (message: string, data?: any) => void;
    error?: (message: string, data?: any) => void;
  };
};

type PatchContext = {
  provider: StubProvider & any;
  recordedRequests: RecordedRequest[];
  fetchRequests: RecordedRequest[];
  readonly legacyCalls: number;
  logs: LoggerEntry[];
};

const defaultLegacyError = () => {
  const err = new Error('HttpError: 406');
  (err as any).statusCode = 406;
  (err as any).code = 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND';
  throw err;
};

const withPatchedProvider = async (options: PatchOptions, fn: (context: PatchContext) => Promise<void>) => {
  const proto = GitHubProvider.prototype as any;
  const original = proto.getLatestTagName;
  const metrics = { legacyCalls: 0 };
  const logs: LoggerEntry[] = [];
  const logger = options.logger ?? {
    info: (message: string, data?: any) => logs.push({ level: 'info', message, data }),
    warn: (message: string, data?: any) => logs.push({ level: 'warn', message, data }),
    error: (message: string, data?: any) => logs.push({ level: 'error', message, data }),
  };
  const legacyImpl = options.legacyImpl ?? defaultLegacyError;

  proto.getLatestTagName = function patchedOriginal(this: any, token: CancellationToken) {
    metrics.legacyCalls += 1;
    return legacyImpl.call(this, token);
  };

  delete proto[patchSymbol];
  installGitHubLatestTagFallback(logger);

  const fetchRequests: RecordedRequest[] = [];
  const fetchQueue: ApiResponseQueueItem[] = [...(options.fetchResponses ?? [JSON.stringify({ tag_name: 'v9.9.9' })])];
  const originalFetch = global.fetch;
  global.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.toString?.() ?? '';
    const headers = init?.headers ?? {};
    fetchRequests.push({ url, headers });
    if (fetchQueue.length === 0) {
      return {
        ok: true,
        status: 200,
        text: async () => '',
      } as any;
    }
    const next = fetchQueue.shift();
    if (next instanceof Error) {
      throw next;
    }
    if (next && typeof next === 'object' && 'status' in next) {
      const status = (next as any).status;
      const body = (next as any).body ?? '';
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => body,
      } as any;
    }
    const body = next ?? '';
    return {
      ok: true,
      status: 200,
      text: async () => body,
    } as any;
  }) as any;

  const provider = createStubProvider({ httpResponses: options.httpResponses, host: options.host });
  const context: PatchContext = {
    provider,
    recordedRequests: provider.recordedRequests as RecordedRequest[],
    fetchRequests,
    get legacyCalls() {
      return metrics.legacyCalls;
    },
    logs,
  };

  try {
    await fn(context);
  } finally {
    proto.getLatestTagName = original;
    delete proto[patchSymbol];
    global.fetch = originalFetch;
  }
};

test('prefers GitHub REST API before legacy HTML lookup', async () => {
  await withPatchedProvider({
    fetchResponses: [JSON.stringify({ tag_name: 'v9.9.9' })],
    legacyImpl() {
      throw new Error('Legacy lookup should not execute when REST API succeeds');
    },
  }, async (ctx) => {
    const tag = await (ctx.provider as any).getLatestTagName(new CancellationToken());
    assert.equal(tag, 'v9.9.9');
    assert.equal(ctx.legacyCalls, 0);
    assert.equal(ctx.fetchRequests.length, 1);
    const request = ctx.fetchRequests[0];
    assert.ok(request.url.endsWith('/releases/latest'));
    assert.equal(request.headers['Accept'], 'application/vnd.github+json');
    assert.equal(request.headers['Authorization'], 'token example');
    assert.equal(request.headers['User-Agent'], 'GitAutomationDashboard-Updater');
    assert.equal(request.headers['X-GitHub-Api-Version'], '2022-11-28');
    assert.ok(ctx.logs.some(entry => entry.level === 'info' && entry.message.includes('REST API')));
    assert.equal(ctx.recordedRequests.length, 0);
  });
});

test('falls back to legacy lookup when REST API fails before legacy succeeds', async () => {
  await withPatchedProvider({
    fetchResponses: [
      { status: 500, body: 'server error' },
    ],
    httpResponses: [{ status: 500, body: 'server error' }],
    legacyImpl() {
      return 'legacy-tag';
    },
  }, async (ctx) => {
    const tag = await (ctx.provider as any).getLatestTagName(new CancellationToken());
    assert.equal(tag, 'legacy-tag');
    assert.equal(ctx.fetchRequests.length, 2);
    assert.equal(ctx.recordedRequests.length, 1);
    assert.equal(ctx.legacyCalls, 1);
    assert.ok(ctx.logs.some(entry => entry.level === 'warn' && entry.message.includes('REST API did not return a tag name')));
  });
});

test('retries REST API after a 406 legacy failure', async () => {
  await withPatchedProvider({
    fetchResponses: [JSON.stringify({}), JSON.stringify({}), JSON.stringify({ tag_name: 'v8.8.8' })],
  }, async (ctx) => {
    const tag = await (ctx.provider as any).getLatestTagName(new CancellationToken());
    assert.equal(tag, 'v8.8.8');
    assert.equal(ctx.fetchRequests.length, 3);
    assert.equal(ctx.legacyCalls, 1);
    assert.ok(ctx.logs.some(entry => entry.level === 'warn' && entry.message.includes('Primary GitHub release lookup failed')));
    assert.ok(ctx.logs.some(entry => entry.level === 'info' && entry.message.includes('API fallback')));
  });
});

test('rethrows original error when API fallback cannot recover', async () => {
  await assert.rejects(withPatchedProvider({
    fetchResponses: [JSON.stringify({}), JSON.stringify({})],
  }, async ({ provider }) => {
    await (provider as any).getLatestTagName(new CancellationToken());
  }), (error: any) => {
    assert.equal(error?.code, 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND');
    return true;
  });
});
