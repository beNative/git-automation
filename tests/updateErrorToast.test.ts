import test from 'node:test';
import assert from 'node:assert/strict';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { formatUpdateErrorToast } from '../electron/updateErrorToast';

test('formatUpdateErrorToast appends HTTP status information without extra detail spam', () => {
  const message = formatUpdateErrorToast('Auto-update error', { statusCode: 406 }, { retryHint: 'Retry soon' });
  assert.equal(message, 'Auto-update error. GitHub responded with HTTP 406 (Not Acceptable). Retry soon.');
});

test('formatUpdateErrorToast coalesces large error payloads into a short hint', () => {
  const hugeMessage = Array.from({ length: 200 }, (_, index) => `line-${index}`).join(' ');
  const toast = formatUpdateErrorToast('Failed to check for updates', { message: hugeMessage }, undefined);
  assert.equal(toast, 'Failed to check for updates. See logs for additional details.');
});
