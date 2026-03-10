import { NextResponse } from 'next/server';
import { getLowInputTelemetrySnapshot, recordLowInputTelemetry } from '@/lib/lowInputTelemetryStore';

type LowInputTelemetryPayload = {
    event?: unknown;
    at?: unknown;
    source?: unknown;
    [key: string]: unknown;
};

const asString = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const asNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
    typeof value === 'boolean' ? value : undefined;

const normalizePayload = (body: LowInputTelemetryPayload): Record<string, string | number | boolean | null> => {
    const normalized: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(body)) {
        if (key === 'event' || key === 'at' || key === 'source') continue;
        if (typeof value === 'string') {
            normalized[key] = value;
            continue;
        }
        const numberValue = asNumber(value);
        if (numberValue !== undefined) {
            normalized[key] = numberValue;
            continue;
        }
        const booleanValue = asBoolean(value);
        if (booleanValue !== undefined) {
            normalized[key] = booleanValue;
            continue;
        }
        if (value === null) {
            normalized[key] = null;
        }
    }

    return normalized;
};

export async function POST(request: Request) {
    let body: LowInputTelemetryPayload | null = null;

    try {
        body = await request.json() as LowInputTelemetryPayload;
    } catch {
        return NextResponse.json({ message: 'Invalid telemetry payload' }, { status: 400 });
    }

    const event = asString(body?.event, '');
    const source = asString(body?.source, '');
    if (!event || !source) {
        return NextResponse.json({ message: 'event and source are required' }, { status: 400 });
    }

    console.info(JSON.stringify({
        service: 'docs-app',
        subsystem: 'low-input-telemetry',
        event,
        source,
        at: asString(body?.at, new Date().toISOString()),
        href: request.headers.get('referer') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        payload: normalizePayload(body ?? {}),
    }));
    recordLowInputTelemetry(event as Parameters<typeof recordLowInputTelemetry>[0], normalizePayload(body ?? {}));

    return NextResponse.json({ ok: true });
}

const isAuthorizedRead = (request: Request): boolean => {
    if (process.env.NODE_ENV !== 'production') return true;
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected) return false;
    return request.headers.get('x-internal-read-secret') === expected;
};

export async function GET(request: Request) {
    if (!isAuthorizedRead(request)) {
        return NextResponse.json({ message: 'Unauthorized internal read' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get('keys');
    const keys = keysParam
        ? Array.from(new Set(keysParam.split(',').map((key) => key.trim()).filter(Boolean))).slice(0, 50)
        : undefined;

    const snapshot = getLowInputTelemetrySnapshot(keys);
    return NextResponse.json({
        message: 'Low-input telemetry snapshot',
        generatedAt: new Date().toISOString(),
        ...snapshot,
    });
}
