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

type ApiResponseQueueItem = string | null | Error;

type LoggerEntry = { level: 'info' | 'warn' | 'error'; message: string; data?: any };

const createStubProvider = (options?: { responses?: ApiResponseQueueItem[]; host?: string }): StubProvider & any => {
  const recordedRequests: RecordedRequest[] = [];
  const queue: ApiResponseQueueItem[] = [...(options?.responses ?? [JSON.stringify({ tag_name: 'v9.9.9' })])];
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
    return next ?? '';
  };
  return provider;
};

type PatchOptions = {
  responses?: ApiResponseQueueItem[];
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

  const provider = createStubProvider({ responses: options.responses, host: options.host });
  const context: PatchContext = {
    provider,
    recordedRequests: provider.recordedRequests as RecordedRequest[],
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
  }
};

test('prefers GitHub REST API before legacy HTML lookup', async () => {
  await withPatchedProvider({
    responses: [JSON.stringify({ tag_name: 'v9.9.9' })],
    legacyImpl() {
      throw new Error('Legacy lookup should not execute when REST API succeeds');
    },
  }, async (ctx) => {
    const tag = await (ctx.provider as any).getLatestTagName(new CancellationToken());
    assert.equal(tag, 'v9.9.9');
    assert.equal(ctx.legacyCalls, 0);
    assert.equal(ctx.recordedRequests.length, 1);
    const request = ctx.recordedRequests[0];
    assert.ok(request.url.endsWith('/releases/latest'));
    assert.equal(request.headers['Accept'], 'application/vnd.github+json');
    assert.equal(request.headers['Authorization'], 'token example');
    assert.equal(request.headers['User-Agent'], 'GitAutomationDashboard-Updater');
    assert.equal(request.headers['X-GitHub-Api-Version'], '2022-11-28');
    assert.ok(ctx.logs.some(entry => entry.level === 'info' && entry.message.includes('REST API')));
  });
});

test('falls back to legacy lookup when REST API fails before legacy succeeds', async () => {
  const originalFetch = global.fetch;
  let fetchCalled = 0;
  global.fetch = (async () => {
    fetchCalled += 1;
    return {
      ok: false,
      status: 500,
      json: async () => ({}),
    } as any;
  }) as any;

  try {
    await withPatchedProvider({
      responses: [Object.assign(new Error('API failure'), { statusCode: 500 })],
      legacyImpl() {
        return 'legacy-tag';
      },
    }, async (ctx) => {
      const tag = await (ctx.provider as any).getLatestTagName(new CancellationToken());
      assert.equal(tag, 'legacy-tag');
      assert.equal(ctx.recordedRequests.length, 2);
      assert.equal(fetchCalled, 2);
      assert.equal(ctx.legacyCalls, 1);
      assert.ok(ctx.logs.some(entry => entry.level === 'warn' && entry.message.includes('REST API did not return a tag name')));
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('retries REST API after a 406 legacy failure', async () => {
  await withPatchedProvider({
    responses: [JSON.stringify({}), JSON.stringify({}), JSON.stringify({ tag_name: 'v8.8.8' })],
  }, async (ctx) => {
    const tag = await (ctx.provider as any).getLatestTagName(new CancellationToken());
    assert.equal(tag, 'v8.8.8');
    assert.equal(ctx.recordedRequests.length, 3);
    assert.equal(ctx.legacyCalls, 1);
    assert.ok(ctx.logs.some(entry => entry.level === 'warn' && entry.message.includes('Primary GitHub release lookup failed')));
    assert.ok(ctx.logs.some(entry => entry.level === 'info' && entry.message.includes('API fallback')));
  });
});

test('rethrows original error when API fallback cannot recover', async () => {
  await assert.rejects(withPatchedProvider({
    responses: [JSON.stringify({}), JSON.stringify({})],
  }, async ({ provider }) => {
    await (provider as any).getLatestTagName(new CancellationToken());
  }), (error: any) => {
    assert.equal(error?.code, 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND');
    return true;
  });
});
