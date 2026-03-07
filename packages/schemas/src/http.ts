const DEFAULT_INTERNAL_HTTP_TIMEOUT_MS = Math.max(
  500,
  Number.parseInt(process.env.INTERNAL_SERVICE_TIMEOUT_MS ?? '3000', 10) || 3000,
);

export interface PostJsonRequestOptions {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  logContext?: DependencyLogContext;
}

export interface JsonRequestOptions {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  logContext?: DependencyLogContext;
}

export interface PostJsonRequestResult {
  ok: boolean;
  status: number;
  bodyText: string | null;
  reason: string;
}

export interface JsonRequestResult<T> extends PostJsonRequestResult {
  data: T | null;
}

export interface DependencyLogContext {
  service: string;
  dependency: string;
  operation: string;
  subsystem?: string;
}

const truncateText = (value: string | null, maxLength = 160): string | null => {
  if (!value) return null;
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
};

const getUrlOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return 'unknown';
  }
};

const logDependencyFailure = (params: {
  method: 'GET' | 'POST';
  url: string;
  timeoutMs: number;
  durationMs: number;
  status: number;
  reason: string;
  bodyText: string | null;
  logContext?: DependencyLogContext;
}): void => {
  if (!params.logContext) return;

  const payload = {
    service: params.logContext.service,
    subsystem: params.logContext.subsystem ?? 'http-client',
    dependency: params.logContext.dependency,
    operation: params.logContext.operation,
    event: 'dependency_request_failed',
    level: 'warn',
    method: params.method,
    target: getUrlOrigin(params.url),
    status: params.status,
    reason: params.reason,
    durationMs: params.durationMs,
    timeoutMs: params.timeoutMs,
    responsePreview: truncateText(params.bodyText),
    ts: new Date().toISOString(),
  };

  console.warn(JSON.stringify(payload));
};

const toFailureReason = (error: unknown): string => {
  if (
    typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'AbortError'
  ) {
    return 'timeout';
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as {
      code?: unknown;
      name?: unknown;
      cause?: { code?: unknown };
    };

    if (typeof record.cause?.code === 'string' && record.cause.code) {
      return record.cause.code;
    }

    if (typeof record.code === 'string' && record.code) {
      return record.code;
    }

    if (typeof record.name === 'string' && record.name) {
      return record.name;
    }
  }

  return 'fetch_failed';
};

const safeReadText = async (response: Response): Promise<string | null> => {
  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
};

export const requestJson = async <T>({
  url,
  method = 'GET',
  body,
  headers,
  timeoutMs = DEFAULT_INTERNAL_HTTP_TIMEOUT_MS,
  logContext,
}: JsonRequestOptions): Promise<JsonRequestResult<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const resolvedHeaders = body === undefined
    ? headers
    : {
      'Content-Type': 'application/json',
      ...headers,
    };
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method,
      ...(resolvedHeaders ? { headers: resolvedHeaders } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });

    if (response.ok) {
      let data: T | null = null;
      try {
        if (response.status !== 204) {
          data = await response.json() as T;
        }
      } catch {
        data = null;
      }

      return {
        ok: true,
        status: response.status,
        bodyText: null,
        reason: 'ok',
        data,
      };
    }

    const bodyText = await safeReadText(response);
    logDependencyFailure({
      method,
      url,
      timeoutMs,
      durationMs: Date.now() - startedAt,
      status: response.status,
      reason: `http_${response.status}`,
      bodyText,
      logContext,
    });

    return {
      ok: false,
      status: response.status,
      bodyText,
      reason: `http_${response.status}`,
      data: null,
    };
  } catch (error) {
    const reason = toFailureReason(error);
    logDependencyFailure({
      method,
      url,
      timeoutMs,
      durationMs: Date.now() - startedAt,
      status: 0,
      reason,
      bodyText: null,
      logContext,
    });

    return {
      ok: false,
      status: 0,
      bodyText: null,
      reason,
      data: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const postJsonRequest = async ({
  url,
  body,
  headers,
  timeoutMs = DEFAULT_INTERNAL_HTTP_TIMEOUT_MS,
  logContext,
}: PostJsonRequestOptions): Promise<PostJsonRequestResult> => {
  const result = await requestJson<null>({
    url,
    method: 'POST',
    body,
    ...(headers ? { headers } : {}),
    timeoutMs,
    ...(logContext ? { logContext } : {}),
  });

  return {
    ok: result.ok,
    status: result.status,
    bodyText: result.bodyText,
    reason: result.reason,
  };
};