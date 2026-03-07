type JsonResponse = {
    status: (code: number) => JsonResponse;
    json: (body: unknown) => unknown;
    send?: (body: string) => unknown;
    setHeader?: (name: string, value: string) => unknown;
};

type RouteRegistrar = {
    get: (path: string, handler: (_req: unknown, res: JsonResponse) => unknown) => unknown;
};

type MiddlewareRegistrar = RouteRegistrar & {
    set?: (setting: string, value: boolean | number | string) => unknown;
    use: (handler: (req: RequestLike, res: ResponseLike, next: () => void) => unknown) => unknown;
};

type RequestLike = {
    method?: string;
    path?: string;
    originalUrl?: string;
    url?: string;
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
    statusCode?: number;
    setHeader?: (name: string, value: string) => unknown;
    on?: (event: string, handler: () => void) => unknown;
};

type RuntimeLogger = Pick<Console, 'info' | 'warn' | 'error'>;

export type ReadinessCheck = {
    name: string;
    check: () => Promise<void> | void;
};

type RegisterOperationalRoutesOptions = {
    app: RouteRegistrar;
    serviceName: string;
    readinessChecks?: ReadinessCheck[];
    collectMetrics?: () => Record<string, number> | Promise<Record<string, number>>;
};

type RegisterOperationalMiddlewareOptions = {
    app: MiddlewareRegistrar;
    serviceName: string;
    logger?: RuntimeLogger;
    requestIdHeader?: string;
    trustProxy?: boolean | number | string;
};

type RegisterProcessSafetyHandlersOptions = {
    serviceName: string;
    shutdown: () => Promise<void> | void;
    logger?: RuntimeLogger;
    exit?: (code: number) => void;
    shutdownTimeoutMs?: number;
};

type ValidateRequiredEnvOptions = {
    serviceName: string;
    requiredEnv: string[];
    mode?: string;
    validateInDevelopment?: boolean;
};

const isBlank = (value: string | undefined): boolean => !value || value.trim().length === 0;

const DEFAULT_REQUEST_ID_HEADER = 'x-request-id';

const METRICS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

const toPrometheusMetricName = (name: string): string =>
    name
        .replace(/[^a-zA-Z0-9_:]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');

const getProcessMetrics = (): Record<string, number> => {
    const memory = process.memoryUsage();

    return {
        process_uptime_seconds: Math.round(process.uptime() * 100) / 100,
        process_resident_memory_bytes: memory.rss,
        process_heap_total_bytes: memory.heapTotal,
        process_heap_used_bytes: memory.heapUsed,
        process_external_memory_bytes: memory.external,
        process_array_buffers_bytes: memory.arrayBuffers,
    };
};

const renderPrometheusMetrics = (params: {
    serviceName: string;
    timestampMs: number;
    metrics: Record<string, number>;
}): string => {
    const serviceLabel = params.serviceName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const lines: string[] = [
        '# HELP sat_metrics_scrape_timestamp_seconds Unix timestamp of this scrape',
        '# TYPE sat_metrics_scrape_timestamp_seconds gauge',
        `sat_metrics_scrape_timestamp_seconds{service="${serviceLabel}"} ${Math.floor(params.timestampMs / 1000)}`,
        '',
    ];

    for (const [rawName, value] of Object.entries(params.metrics)) {
        const metricName = toPrometheusMetricName(rawName);
        lines.push(`# HELP ${metricName} Runtime metric ${metricName}`);
        lines.push(`# TYPE ${metricName} gauge`);
        lines.push(`${metricName}{service="${serviceLabel}"} ${value}`);
        lines.push('');
    }

    return lines.join('\n');
};

const resolveTrustProxySetting = (
    trustProxy: boolean | number | string | undefined,
): boolean | number | string => {
    if (trustProxy !== undefined) return trustProxy;

    const configured = process.env.TRUST_PROXY?.trim();
    if (configured) {
        const normalized = configured.toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;

        const numeric = Number.parseInt(configured, 10);
        if (!Number.isNaN(numeric) && String(numeric) === configured) {
            return numeric;
        }

        return configured;
    }

    return process.env.NODE_ENV === 'production' ? 1 : false;
};

const generateRequestId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const getFirstHeaderValue = (
    headers: Record<string, string | string[] | undefined> | undefined,
    key: string,
): string | undefined => {
    if (!headers) return undefined;
    const value = headers[key] ?? headers[key.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
};

const getClientIp = (req: RequestLike): string | undefined => {
    const forwardedFor = getFirstHeaderValue(req.headers, 'x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim();
    }
    return req.ip;
};

const serializeError = (error: unknown): Record<string, string> | undefined => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
        };
    }

    if (typeof error === 'string') {
        return { name: 'Error', message: error };
    }

    return undefined;
};

export const validateRequiredEnv = ({
    serviceName,
    requiredEnv,
    mode = process.env.NODE_ENV,
    validateInDevelopment = false,
}: ValidateRequiredEnvOptions): void => {
    if (mode === 'test') return;
    if (mode !== 'production' && !validateInDevelopment) return;

    const missing = requiredEnv.filter((key) => isBlank(process.env[key]));
    if (missing.length === 0) return;

    throw new Error(`[${serviceName}] Missing required environment variables: ${missing.join(', ')}`);
};

export const registerOperationalRoutes = ({
    app,
    serviceName,
    readinessChecks = [],
    collectMetrics,
}: RegisterOperationalRoutesOptions): void => {
    app.get('/health', (_req, res) => {
        res.json({
            service: serviceName,
            status: 'ok',
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    });

    app.get('/metrics', async (_req, res) => {
        const timestampMs = Date.now();
        const customMetrics = collectMetrics ? await collectMetrics() : {};
        const metrics = {
            ...getProcessMetrics(),
            ...customMetrics,
        };

        res.json({
            service: serviceName,
            generatedAt: new Date(timestampMs).toISOString(),
            metrics,
        });
    });

    app.get('/metrics/prometheus', async (_req, res) => {
        const timestampMs = Date.now();
        const customMetrics = collectMetrics ? await collectMetrics() : {};
        const metrics = {
            ...getProcessMetrics(),
            ...customMetrics,
        };

        res.setHeader?.('Content-Type', METRICS_CONTENT_TYPE);
        res.status(200);
        const body = renderPrometheusMetrics({
            serviceName,
            timestampMs,
            metrics,
        });
        if (typeof res.send === 'function') {
            res.send(body);
            return;
        }
        res.json(body);
    });

    app.get('/ready', async (_req, res) => {
        const results = await Promise.all(
            readinessChecks.map(async ({ name, check }) => {
                try {
                    await check();
                    return { name, ok: true as const };
                } catch (error) {
                    return {
                        name,
                        ok: false as const,
                        error: error instanceof Error ? error.message : 'unknown_error',
                    };
                }
            })
        );

        const failedChecks = results.filter((result) => !result.ok);
        if (failedChecks.length > 0) {
            res.status(503).json({
                service: serviceName,
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: results,
            });
            return;
        }

        res.json({
            service: serviceName,
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: results,
        });
    });
};

export const registerOperationalMiddleware = ({
    app,
    serviceName,
    logger = console,
    requestIdHeader = DEFAULT_REQUEST_ID_HEADER,
    trustProxy,
}: RegisterOperationalMiddlewareOptions): void => {
    app.set?.('trust proxy', resolveTrustProxySetting(trustProxy));

    app.use((req, res, next) => {
        const startedAt = process.hrtime.bigint();
        const requestId = getFirstHeaderValue(req.headers, requestIdHeader) ?? generateRequestId();
        res.setHeader?.(requestIdHeader, requestId);

        res.on?.('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
            const statusCode = res.statusCode ?? 200;
            const payload = {
                service: serviceName,
                event: 'request.completed',
                requestId,
                method: req.method ?? 'UNKNOWN',
                path: req.originalUrl ?? req.url ?? req.path ?? '/',
                statusCode,
                durationMs: Math.round(durationMs * 100) / 100,
                clientIp: getClientIp(req),
            };

            const message = JSON.stringify(payload);
            if (statusCode >= 500) {
                logger.error(message);
                return;
            }
            if (statusCode >= 400) {
                logger.warn(message);
                return;
            }
            logger.info(message);
        });

        next();
    });
};

export const registerProcessSafetyHandlers = ({
    serviceName,
    shutdown,
    logger = console,
    exit = (code: number) => {
        process.exit(code);
    },
    shutdownTimeoutMs = 10_000,
}: RegisterProcessSafetyHandlersOptions): void => {
    let shutdownStarted = false;

    const runShutdown = async (reason: string, exitCode: number, error?: unknown): Promise<void> => {
        if (shutdownStarted) return;
        shutdownStarted = true;

        const timeout = setTimeout(() => {
            logger.error(JSON.stringify({
                service: serviceName,
                event: 'process.shutdown.timeout',
                reason,
                timeoutMs: shutdownTimeoutMs,
            }));
            exit(exitCode);
        }, shutdownTimeoutMs);

        const payload = {
            service: serviceName,
            event: exitCode === 0 ? 'process.shutdown.signal' : 'process.shutdown.fatal',
            reason,
            ...(serializeError(error) ? { error: serializeError(error) } : {}),
        };

        if (exitCode === 0) {
            logger.info(JSON.stringify(payload));
        } else {
            logger.error(JSON.stringify(payload));
        }

        try {
            await shutdown();
        } finally {
            clearTimeout(timeout);
            exit(exitCode);
        }
    };

    process.on('SIGTERM', () => {
        void runShutdown('SIGTERM', 0);
    });
    process.on('SIGINT', () => {
        void runShutdown('SIGINT', 0);
    });
    process.on('unhandledRejection', (reason) => {
        void runShutdown('unhandledRejection', 1, reason);
    });
    process.on('uncaughtException', (error) => {
        void runShutdown('uncaughtException', 1, error);
    });
};