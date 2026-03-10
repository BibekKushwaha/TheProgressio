import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureSentry, reportError, resetErrorReporterForTests } from '@/lib/errorReporter';

describe('errorReporter', () => {
  const originalSendBeacon = navigator.sendBeacon;

  beforeEach(() => {
    resetErrorReporterForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetErrorReporterForTests();
    Object.defineProperty(navigator, 'sendBeacon', {
      value: originalSendBeacon,
      configurable: true,
      writable: true,
    });
  });

  it('delegates to the configured capture function when present', () => {
    const capture = vi.fn();
    configureSentry(capture);

    const error = new Error('sentry target');
    reportError(error, { context: 'unit-test' });

    expect(capture).toHaveBeenCalledWith(error, { context: 'unit-test' });
  });

  it('sends browser errors to the first-party client error endpoint', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });

    reportError(new Error('browser error'), { context: 'browser-test' });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, payload] = sendBeacon.mock.calls[0] ?? [];
    expect(url).toBe('/api/client-errors');
    expect(payload).toBeInstanceOf(Blob);
  });

  it('ignores known ResizeObserver browser noise', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });

    reportError(new Error('ResizeObserver loop completed with undelivered notifications.'), {
      context: 'window.error',
    });

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
