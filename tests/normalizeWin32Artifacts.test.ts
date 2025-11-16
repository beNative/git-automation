import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve(
  __dirname,
  '..',
  '..',
  'electron',
  'scripts',
  'normalize-win32-artifacts.mjs',
);

const createTempRelease = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'normalize-win32-'));
  const releaseDir = path.join(root, 'release');
  await mkdir(releaseDir, { recursive: true });
  return { root, releaseDir };
};

test('normalize script renames win32 artifacts and refreshes manifest hashes', async () => {
  const { root, releaseDir } = await createTempRelease();
  try {
    const exeName = 'git-automation-dashboard-0.26.0-windows-ia32-setup.exe';
    const blockmapName = `${exeName}.blockmap`;
    const renamedExe = exeName.replace('-ia32-', '-win32-');
    const renamedBlockmap = blockmapName.replace('-ia32-', '-win32-');

    const exeContent = Buffer.from('dummy-win32-binary');
    const blockmapContent = Buffer.from('dummy-blockmap');

    await writeFile(path.join(releaseDir, exeName), exeContent);
    await writeFile(path.join(releaseDir, blockmapName), blockmapContent);

    const manifest = `version: 0.26.0\nfiles:\n  - url: ${exeName}\n    sha512: INVALID\n    size: ${exeContent.length}\n  - url: ${blockmapName}\n    sha512: ALSO-INVALID\n    size: ${blockmapContent.length}\npath: ${exeName}\nsha512: WRONG\nreleaseDate: 2025-01-01T00:00:00.000Z\n`;
    await writeFile(path.join(releaseDir, 'latest.yml'), manifest, 'utf8');

    await execFileAsync('node', [scriptPath], { cwd: root });

    const renamedExePath = path.join(releaseDir, renamedExe);
    const renamedBlockmapPath = path.join(releaseDir, renamedBlockmap);

    await assert.rejects(readFile(path.join(releaseDir, exeName)), (error: any) => error?.code === 'ENOENT');
    await assert.rejects(readFile(path.join(releaseDir, blockmapName)), (error: any) => error?.code === 'ENOENT');

    const updatedManifest = await readFile(path.join(releaseDir, 'latest.yml'), 'utf8');
    const win32Manifest = await readFile(path.join(releaseDir, 'latest-win32.yml'), 'utf8');

    const exeHash = crypto.createHash('sha512').update(exeContent).digest('base64');
    const blockmapHash = crypto.createHash('sha512').update(blockmapContent).digest('base64');

    assert.ok(updatedManifest.includes(renamedExe));
    assert.ok(updatedManifest.includes(renamedBlockmap));
    assert.ok(updatedManifest.includes(`sha512: ${exeHash}`));
    assert.ok(updatedManifest.includes(`sha512: ${blockmapHash}`));
    assert.equal(updatedManifest, win32Manifest);

    const before = updatedManifest;
    await execFileAsync('node', [scriptPath], { cwd: root });
    const after = await readFile(path.join(releaseDir, 'latest.yml'), 'utf8');
    assert.equal(after, before, 'script should be idempotent when run again');

    // Ensure renamed files still exist after idempotent run
    const renamedExeContent = await readFile(renamedExePath);
    const renamedBlockmapContent = await readFile(renamedBlockmapPath);
    assert.equal(renamedExeContent.toString(), exeContent.toString());
    assert.equal(renamedBlockmapContent.toString(), blockmapContent.toString());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
