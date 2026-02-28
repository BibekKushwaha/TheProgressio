type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
    typeof value === 'object' && value !== null;

export function getApiErrorStatus(error: unknown): number | null {
    if (!isRecord(error) || typeof error.status !== 'number') return null;
    return error.status;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
    if (!isRecord(error)) return fallback;

    if (typeof error.status === 'string' && error.status === 'FETCH_ERROR') {
        return 'Unable to reach the server. Please check that backend services are running.';
    }

    if (typeof error.error === 'string' && error.error.trim()) {
        if (error.error.includes('FETCH_ERROR') || error.error.includes('Failed to fetch')) {
            return 'Unable to reach the server. Please check that backend services are running.';
        }
        return error.error;
    }

    if (isRecord(error.data)) {
        const message = error.data.message;
        if (typeof message === 'string' && message.trim()) {
            return message;
        }

        if (Array.isArray(message)) {
            const joined = message
                .filter((entry): entry is string => typeof entry === 'string')
                .join(', ');
            if (joined) return joined;
        }

        if (typeof error.data.error === 'string' && error.data.error.trim()) {
            return error.data.error;
        }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
    }

    const status = getApiErrorStatus(error);
    return status ? `${fallback} (HTTP ${status})` : fallback;
}

export function apiErrorMessageIncludes(error: unknown, pattern: string): boolean {
    const message = getApiErrorMessage(error, '').toLowerCase();
    return message.includes(pattern.toLowerCase());
}

/**
 * Convenience helper for mutation catch blocks.
 *
 * Shows a `sonner` toast with the extracted error message and, in development
 * only, logs the raw error to the console.
 *
 * Usage:
 *   ```ts
 *   import { toast } from 'sonner';
 *   import { handleMutationError } from '@/lib/api-error';
 *
 *   try {
 *     await doSomething().unwrap();
 *   } catch (err) {
 *     handleMutationError(err, toast.error, 'Failed to save');
 *   }
 *   ```
 */
export function handleMutationError(
    error: unknown,
    toastError: (message: string) => void,
    fallback = 'Something went wrong',
): void {
    if (process.env.NODE_ENV !== 'production') {
        console.error('[mutation error]', error);
    }
    toastError(getApiErrorMessage(error, fallback));
}

