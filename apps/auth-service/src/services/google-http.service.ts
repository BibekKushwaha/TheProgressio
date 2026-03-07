import ErrorHandler from "../utils/errorHandler.js";

const DEFAULT_GOOGLE_HTTP_TIMEOUT_MS = Math.max(
  1_000,
  Number.parseInt(process.env.GOOGLE_HTTP_TIMEOUT_MS ?? "5000", 10) || 5000,
);

type GoogleDependency = "google-certs" | "google-oauth";

const truncateText = (value: string | null, maxLength = 160): string | null => {
  if (!value) return null;
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
};

const getTargetOrigin = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return "unknown";
  }
};

const logGoogleFailure = (params: {
  dependency: GoogleDependency;
  operation: string;
  method: "GET" | "POST";
  url: string;
  status: number;
  reason: string;
  durationMs: number;
  timeoutMs: number;
  bodyText: string | null;
}): void => {
  console.warn(JSON.stringify({
    service: "auth-service",
    subsystem: "google-oauth",
    dependency: params.dependency,
    operation: params.operation,
    event: "dependency_request_failed",
    level: "warn",
    method: params.method,
    target: getTargetOrigin(params.url),
    status: params.status,
    reason: params.reason,
    durationMs: params.durationMs,
    timeoutMs: params.timeoutMs,
    responsePreview: truncateText(params.bodyText),
    ts: new Date().toISOString(),
  }));
};

const performTimedFetch = async (params: {
  dependency: GoogleDependency;
  operation: string;
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}): Promise<Response> => {
  const timeoutMs = params.timeoutMs ?? DEFAULT_GOOGLE_HTTP_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    return await fetch(params.url, {
      method: params.method,
      ...(params.headers ? { headers: params.headers } : {}),
      ...(params.body !== undefined ? { body: params.body } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
      ? "timeout"
      : "fetch_failed";
    logGoogleFailure({
      dependency: params.dependency,
      operation: params.operation,
      method: params.method,
      url: params.url,
      status: 0,
      reason,
      durationMs: Date.now() - startedAt,
      timeoutMs,
      bodyText: null,
    });
    if (reason === "timeout") {
      throw new ErrorHandler(504, `Google request timed out during ${params.operation}`);
    }
    throw new ErrorHandler(502, `Google request failed during ${params.operation}`);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchGoogleCertsPayload = async (url: string): Promise<{
  certs: Record<string, string>;
  cacheControl: string;
}> => {
  const startedAt = Date.now();
  const response = await performTimedFetch({
    dependency: "google-certs",
    operation: "fetch_signing_certs",
    url,
    method: "GET",
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => null);
    logGoogleFailure({
      dependency: "google-certs",
      operation: "fetch_signing_certs",
      method: "GET",
      url,
      status: response.status,
      reason: `http_${response.status}`,
      durationMs: Date.now() - startedAt,
      timeoutMs: DEFAULT_GOOGLE_HTTP_TIMEOUT_MS,
      bodyText,
    });
    throw new ErrorHandler(502, "Failed to fetch Google certs");
  }

  return {
    certs: (await response.json()) as Record<string, string>,
    cacheControl: response.headers.get("cache-control") ?? "",
  };
};

export const exchangeGoogleCode = async (params: {
  url: string;
  body: URLSearchParams;
}): Promise<Record<string, unknown>> => {
  const startedAt = Date.now();
  const response = await performTimedFetch({
    dependency: "google-oauth",
    operation: "exchange_oauth_code",
    url: params.url,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.body.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    logGoogleFailure({
      dependency: "google-oauth",
      operation: "exchange_oauth_code",
      method: "POST",
      url: params.url,
      status: response.status,
      reason: `http_${response.status}`,
      durationMs: Date.now() - startedAt,
      timeoutMs: DEFAULT_GOOGLE_HTTP_TIMEOUT_MS,
      bodyText: JSON.stringify(payload),
    });
  }

  return payload;
};