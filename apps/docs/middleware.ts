import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes that require an authenticated session.
 * Fast cookie-presence check at the edge so unauthenticated users are
 * redirected before any page bundle is sent to the browser, eliminating
 * the "Verifying session" flash.
 *
 * AuthGuard still runs inside these pages and performs the real API-level
 * validity check (handles token expiry, account suspension, etc.).
 */
const PROTECTED_PREFIXES = [
    '/dashboard',
    '/planner',
    '/tasks',
    '/createtask',
    '/calendar',
    '/habits',
    '/analytics',
    '/settings',
    '/achievement',
    '/reports',
    '/subjects',
    '/syllabus-digitizer',
    '/exam-warroom',
    '/advanced',
    '/family-connect',
];

/**
 * Auth routes — redirect to dashboard if a token cookie already exists.
 */
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static  (static files)
         * - _next/image   (image optimisation)
         * - favicon.ico
         * - public assets
         * - api routes    (handled by the backend)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
