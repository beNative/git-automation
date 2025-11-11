const extractHttpStatusCode = (error: unknown): number | null => {
  const direct = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : null;
  if (direct) {
    return direct;
  }
  const message = typeof (error as any)?.message === 'string'
    ? (error as any).message
    : typeof error === 'string'
      ? error
      : '';
  if (!message) {
    return null;
  }
  const match = /HttpError:\s*(\d{3})/.exec(message);
  return match ? Number.parseInt(match[1], 10) : null;
};

const shortenMessage = (message: string, maxLength = 160): string => {
  if (message.length <= maxLength) {
    return message;
  }
  return `${message.slice(0, maxLength - 1)}…`;
};

const summarizeUpdateErrorMessage = (error: unknown): string => {
  const raw = typeof (error as any)?.message === 'string'
    ? (error as any).message
    : typeof error === 'string'
      ? error
      : '';
  if (!raw) {
    return '';
  }
  let summary = raw;
  const xmlIndex = summary.indexOf('XML:');
  if (xmlIndex >= 0) {
    summary = summary.slice(0, xmlIndex);
  }
  const headersIndex = summary.indexOf('Headers:');
  if (headersIndex >= 0) {
    summary = summary.slice(0, headersIndex);
  }
  summary = summary.replace(/\s+/g, ' ').trim();
  return shortenMessage(summary);
};

const formatUpdateErrorToast = (base: string, error: unknown, options?: { retryHint?: string }): string => {
  let message = base.trim();
  if (!/[.!?]$/.test(message)) {
    message += '.';
  }

  const detail = (() => {
    const statusCode = extractHttpStatusCode(error);
    if (statusCode) {
      const suffix = statusCode === 406 ? ' (Not Acceptable)' : '';
      return `GitHub responded with HTTP ${statusCode}${suffix}.`;
    }
    const summary = summarizeUpdateErrorMessage(error);
    if (summary) {
      const normalized = summary.endsWith('.') ? summary : `${summary}.`;
      return normalized;
    }
    return null;
  })();

  if (detail) {
    const normalizedDetail = detail.replace(/\s+/g, ' ').trim();
    const MAX_DETAIL_LENGTH = 140;
    if (normalizedDetail.length > MAX_DETAIL_LENGTH) {
      message += ' See logs for additional details.';
    } else {
      message += ` ${normalizedDetail}`;
    }
  }

  const hint = options?.retryHint?.trim();
  if (hint) {
    message += ` ${hint.endsWith('.') ? hint : `${hint}.`}`;
  }
  return message.replace(/\s+/g, ' ').trim();
};

export { extractHttpStatusCode, summarizeUpdateErrorMessage, formatUpdateErrorToast };
