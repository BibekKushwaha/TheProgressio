import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@repo/db/client', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import app from '../src/index.js';
import { prisma } from '@repo/db/client';
import {
  registerOperationalMiddleware,
  registerOperationalRoutes,
  registerProcessSafetyHandlers,
  validateRequiredEnv,
} from '@repo/schemas/runtime';

describe('runtime helpers', () => {
  const originalJwtSecret = process.env.JWT_SEC;

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SEC;
    } else {
      process.env.JWT_SEC = originalJwtSecret;
    }
  });

  it('throws in production when a required environment variable is missing', () => {
    delete process.env.JWT_SEC;

    expect(() =>
      validateRequiredEnv({
        serviceName: 'auth-service',
        requiredEnv: ['JWT_SEC'],
        mode: 'production',
      })
    ).toThrow(/JWT_SEC/);
  });

  it('skips validation in test mode', () => {
    delete process.env.JWT_SEC;

    expect(() =>
      validateRequiredEnv({
        serviceName: 'auth-service',
        requiredEnv: ['JWT_SEC'],
        mode: 'test',
      })
    ).not.toThrow();
  });

  it('registers healthy operational routes', async () => {
    const testApp = express();
    registerOperationalRoutes({
      app: testApp,
      serviceName: 'test-service',
      readinessChecks: [
        {
          name: 'database',
          check: async () => undefined,
        },
      ],
    });

    const healthResponse = await request(testApp).get('/health');
    const readyResponse = await request(testApp).get('/ready');

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toMatchObject({
      service: 'test-service',
      status: 'ok',
    });

    expect(readyResponse.status).toBe(200);
    expect(readyResponse.body).toMatchObject({
      service: 'test-service',
      status: 'ready',
    });
    expect(readyResponse.body.checks).toEqual([
      expect.objectContaining({ name: 'database', ok: true }),
    ]);
  });

  it('returns 503 when a readiness check fails', async () => {
    const testApp = express();
    registerOperationalRoutes({
      app: testApp,
      serviceName: 'test-service',
      readinessChecks: [
        {
          name: 'database',
          check: async () => {
            throw new Error('db_down');
          },
        },
      ],
    });

    const readyResponse = await request(testApp).get('/ready');

    expect(readyResponse.status).toBe(503);
    expect(readyResponse.body).toMatchObject({
      service: 'test-service',
      status: 'not_ready',
    });
    expect(readyResponse.body.checks).toEqual([
      expect.objectContaining({ name: 'database', ok: false, error: 'db_down' }),
    ]);
  });

  it('registers JSON and Prometheus metrics routes', async () => {
    const testApp = express();
    registerOperationalRoutes({
      app: testApp,
      serviceName: 'test-service',
      collectMetrics: () => ({ custom_metric_total: 7 }),
    });

    const metricsResponse = await request(testApp).get('/metrics');
    const prometheusResponse = await request(testApp).get('/metrics/prometheus');

    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.body).toMatchObject({
      service: 'test-service',
      metrics: expect.objectContaining({
        custom_metric_total: 7,
        process_uptime_seconds: expect.any(Number),
      }),
    });

    expect(prometheusResponse.status).toBe(200);
    expect(prometheusResponse.headers['content-type']).toContain('text/plain');
    expect(prometheusResponse.text).toContain('custom_metric_total{service="test-service"} 7');
    expect(prometheusResponse.text).toContain('sat_metrics_scrape_timestamp_seconds{service="test-service"}');
  });

  it('registers request IDs and structured request logs', async () => {
    const testApp = express();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    registerOperationalMiddleware({
      app: testApp,
      serviceName: 'test-service',
      logger,
    });
    testApp.get('/ping', (_req, res) => {
      res.status(201).json({ ok: true });
    });

    const response = await request(testApp).get('/ping');

    expect(response.status).toBe(201);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logger.info.mock.calls[0]?.[0] ?? '{}')).toMatchObject({
      service: 'test-service',
      event: 'request.completed',
      method: 'GET',
      path: '/ping',
      statusCode: 201,
    });
  });

  it('configures express trust proxy before registering request middleware', () => {
    const appWithSet = {
      set: vi.fn(),
      use: vi.fn(),
      get: vi.fn(),
    };

    registerOperationalMiddleware({
      app: appWithSet,
      serviceName: 'test-service',
      trustProxy: 2,
    });

    expect(appWithSet.set).toHaveBeenCalledWith('trust proxy', 2);
    expect(appWithSet.use).toHaveBeenCalledTimes(1);
  });

  it('registers process safety handlers that shutdown on fatal errors', async () => {
    const listeners = new Map<string, (...args: unknown[]) => unknown>();
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const processOnSpy = vi.spyOn(process, 'on').mockImplementation(((event: string, handler: (...args: unknown[]) => unknown) => {
      listeners.set(event, handler);
      return process;
    }) as typeof process.on);

    registerProcessSafetyHandlers({
      serviceName: 'test-service',
      shutdown,
      exit,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      shutdownTimeoutMs: 50,
    });

    const handler = listeners.get('unhandledRejection');
    expect(handler).toBeTruthy();

    await handler?.(new Error('boom'));
    await vi.waitFor(() => {
      expect(shutdown).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    processOnSpy.mockRestore();
  });
});

describe('auth-service operational routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ ready: 1 }]);
  });

  it('exposes service health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      service: 'auth-service',
      status: 'ok',
    });
  });

  it('reports readiness when the database check succeeds', async () => {
    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      service: 'auth-service',
      status: 'ready',
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('exposes service metrics endpoints', async () => {
    const jsonResponse = await request(app).get('/metrics');
    const prometheusResponse = await request(app).get('/metrics/prometheus');

    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.body).toMatchObject({
      service: 'auth-service',
      metrics: expect.objectContaining({
        process_uptime_seconds: expect.any(Number),
      }),
    });

    expect(prometheusResponse.status).toBe(200);
    expect(prometheusResponse.headers['content-type']).toContain('text/plain');
    expect(prometheusResponse.text).toContain('service="auth-service"');
  });

  it('returns 503 when the database check fails', async () => {
    (prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('db_unavailable'));

    const response = await request(app).get('/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      service: 'auth-service',
      status: 'not_ready',
    });
  });
});