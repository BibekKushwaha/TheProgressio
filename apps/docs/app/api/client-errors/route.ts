import { NextResponse } from 'next/server';

type ClientErrorPayload = {
    message?: unknown;
    name?: unknown;
    stack?: unknown;
    context?: unknown;
    href?: unknown;
    userAgent?: unknown;
    ts?: unknown;
};

const asString = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value.trim().length > 0 ? value : fallback;

export async function POST(request: Request) {
    let body: ClientErrorPayload | null = null;

    try {
        body = await request.json() as ClientErrorPayload;
    } catch {
        return NextResponse.json({ message: 'Invalid error payload' }, { status: 400 });
    }

    console.error(JSON.stringify({
        service: 'docs-app',
        subsystem: 'client-errors',
        event: 'frontend_error',
        level: 'error',
        message: asString(body?.message, 'Unknown error'),
        name: asString(body?.name, 'UnknownError'),
        stack: typeof body?.stack === 'string' ? body.stack.slice(0, 4000) : undefined,
        context: body?.context && typeof body.context === 'object' ? body.context : undefined,
        href: typeof body?.href === 'string' ? body.href : undefined,
        userAgent: typeof body?.userAgent === 'string' ? body.userAgent : request.headers.get('user-agent') ?? undefined,
        ts: asString(body?.ts, new Date().toISOString()),
    }));

    return NextResponse.json({ ok: true });
}