"use client";

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReporter';

export function ErrorMonitorBootstrap() {
    useEffect(() => {
        const handleWindowError = (event: ErrorEvent) => {
            reportError(event.error ?? new Error(event.message), {
                context: 'window.error',
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
            });
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            reportError(event.reason, {
                context: 'window.unhandledrejection',
            });
        };

        window.addEventListener('error', handleWindowError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null;
}