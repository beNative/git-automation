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
};

const createStubProvider = (response: string | null, fail: boolean): StubProvider => {
  const recordedRequests: RecordedRequest[] = [];
  const provider: any = Object.create(GitHubProvider.prototype);
  provider.options = { owner: 'example', repo: 'repo' } as any;
  provider.baseApiUrl = new URL('https://api.github.com/repos/example/repo/releases');
  provider.computeGithubBasePath = (path: string) => path;
  provider.requestHeaders = { Authorization: 'token example' } as any;
  provider.recordedRequests = recordedRequests;
  provider.httpRequest = async (url: URL, headers: Record<string, string>, _token: CancellationToken) => {
    recordedRequests.push({ url: url.toString(), headers });
    if (fail) {
      const err = new Error('API failure');
      (err as any).statusCode = 500;
      throw err;
    }
    return response ?? '';
  };
  return provider;
};

const withPatchedProvider = async <T>(fn: (provider: StubProvider) => Promise<T>, options?: { response?: string | null; fail?: boolean; logger?: any }): Promise<T> => {
  const proto = GitHubProvider.prototype as any;
  const original = proto.getLatestTagName;
  const response = options?.response ?? JSON.stringify({ tag_name: 'v9.9.9' });
  const fail = options?.fail ?? false;
  proto.getLatestTagName = function () {
    const err = new Error('HttpError: 406');
    (err as any).statusCode = 406;
    (err as any).code = 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND';
    throw err;
  };
  delete proto[patchSymbol];
  installGitHubLatestTagFallback(options?.logger);
  try {
    const provider = createStubProvider(response, fail);
    return await fn(provider);
  } finally {
    proto.getLatestTagName = original;
    delete proto[patchSymbol];
  }
};

test('installGitHubLatestTagFallback uses GitHub API when HTML lookup fails with 406', async () => {
  const logs: { level: string; message: string; data?: any }[] = [];
  await withPatchedProvider(async provider => {
    const tag = await (provider as any).getLatestTagName(new CancellationToken());
    assert.equal(tag, 'v9.9.9');
    assert.equal(provider.recordedRequests.length, 1);
    const request = provider.recordedRequests[0];
    assert.ok(request.url.endsWith('/releases/latest'));
    assert.equal(request.headers['Accept'], 'application/vnd.github+json');
    assert.equal(request.headers['Authorization'], 'token example');
    assert.equal(request.headers['User-Agent'], 'GitAutomationDashboard-Updater');
    assert.equal(request.headers['X-GitHub-Api-Version'], '2022-11-28');
  }, {
    logger: {
      warn: (message: string, data?: any) => logs.push({ level: 'warn', message, data }),
      info: (message: string, data?: any) => logs.push({ level: 'info', message, data }),
      error: (message: string, data?: any) => logs.push({ level: 'error', message, data }),
    },
  });
  assert.ok(logs.some(entry => entry.level === 'warn'));
  assert.ok(logs.some(entry => entry.level === 'info'));
});

test('installGitHubLatestTagFallback rethrows original error when API fallback returns no tag', async () => {
  await assert.rejects(withPatchedProvider(async provider => {
    await (provider as any).getLatestTagName(new CancellationToken());
    return null;
  }, { response: JSON.stringify({}) }), (error: any) => {
    assert.equal((error as any)?.statusCode, 406);
    return true;
  });
});

test('installGitHubLatestTagFallback rethrows original error when API fallback fails', async () => {
  await assert.rejects(withPatchedProvider(async provider => {
    await (provider as any).getLatestTagName(new CancellationToken());
    return null;
  }, { fail: true }), (error: any) => {
    assert.equal((error as any)?.statusCode, 406);
    return true;
  });
});
