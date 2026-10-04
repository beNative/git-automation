import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { normalizeExecutablePath, resolveExecutablePath } from '../electron/launchHelpers';

test('normalizeExecutablePath makes path relative if inside repository', () => {
  const repoPath = 'D:\\projects\\my-repo';
  const execPath = 'D:\\projects\\my-repo\\dist\\app.exe';

  const normalized = normalizeExecutablePath(execPath, repoPath);
  assert.equal(normalized, 'dist/app.exe');
});

test('normalizeExecutablePath handles forward slashes in repoPath', () => {
  const repoPath = 'D:/projects/my-repo';
  const execPath = 'D:\\projects\\my-repo\\bin\\release\\app';

  const normalized = normalizeExecutablePath(execPath, repoPath);
  assert.equal(normalized, 'bin/release/app');
});

test('normalizeExecutablePath keeps path absolute if outside repository', () => {
  const repoPath = 'D:\\projects\\my-repo';
  const execPath = 'C:\\Program Files\\Tools\\tool.exe';

  const normalized = normalizeExecutablePath(execPath, repoPath);
  assert.equal(normalized, 'C:\\Program Files\\Tools\\tool.exe');
});

test('normalizeExecutablePath handles empty inputs gracefully', () => {
  assert.equal(normalizeExecutablePath('', 'D:\\projects'), '');
  assert.equal(normalizeExecutablePath('dist/app.exe', null), 'dist/app.exe');
});

test('resolveExecutablePath resolves relative path against repoPath', () => {
  const repoPath = 'D:\\projects\\my-repo';
  const execPath = 'dist/app.exe';

  const result = resolveExecutablePath(repoPath, execPath);
  assert.equal(result.fullPath, path.resolve(repoPath, 'dist/app.exe'));
  assert.equal(result.cwd, repoPath);
});

test('resolveExecutablePath preserves absolute path and uses repoPath as cwd if provided', () => {
  const repoPath = 'D:\\projects\\my-repo';
  const execPath = 'C:\\Tools\\app.exe';

  const result = resolveExecutablePath(repoPath, execPath);
  assert.equal(result.fullPath, 'C:\\Tools\\app.exe');
  assert.equal(result.cwd, repoPath);
});

test('resolveExecutablePath falls back to file directory if repoPath is empty', () => {
  const execPath = 'C:\\Tools\\app.exe';

  const result = resolveExecutablePath('', execPath);
  assert.equal(result.fullPath, 'C:\\Tools\\app.exe');
  assert.equal(result.cwd, 'C:\\Tools');
});
