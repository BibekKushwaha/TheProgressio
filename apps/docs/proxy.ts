import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes that require an authenticated session.
 * Fast cookie-presence check at the edge so unauthenticated users are
 * redirected before any page bundle is sent to the browser, eliminating
 * the "Verifying session" flash.
 *
 * AuthGuard still runs inside these pages and performs the real API-level
 * validity check (handles token expiry, signature validation, revocation, etc.).
 * The backend's /api/auth/refresh endpoint handles token renewal if needed.
 *
 * NOTE: The proxy does NOT verify JWT signatures or expiry — only the presence
 * of cookies. This is intentional:
 * 1. Expired tokens should still deliver the page; client-side refresh can recover
 * 2. JWT verification is resource-intensive; better done once per API call
 * 3. Opaque refresh tokens (stored in DB) require backend query anyway
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
    '/syllabus',
    '/syllabus-digitizer',
    '/exam-warroom',
    '/advanced',
    '/family-connect',
];

// Auth routes — only used to skip redirect rules, not to redirect away.
// We intentionally do NOT redirect authenticated users away from these pages
// at the edge because the cookie-presence check (`Boolean(token)`) cannot
// determine if the token is still valid. A stale/expired cookie would cause
// a redirect loop: login → /dashboard → AuthGuard → back to login.
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const _isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

    // Simply check for token presence — do NOT verify JWT expiry or signature here.
    // Reasons:
    // 1. Expired tokens (on their own) don't mean the session is dead; refresh can recover
    // 2. Either the /api/auth/refresh backend endpoint or AuthGuard will do proper validation
    // 3. Moving validation to backend means refresh tokens (opaque, DB-stored) can work
    const hasValidSession = Boolean(token);

    if (isProtected && !hasValidSession) {
        // No token at all — hard redirect to login unless refreshToken exists
        // (refreshToken means client can recover via withAuthRefresh)
        if (refreshToken) {
            return NextResponse.next();
        }

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // NOTE: We intentionally skip the "redirect auth routes to /dashboard when
    // cookie exists" pattern here. Cookie presence ≠ valid session — a JWT can
    // be expired while the cookie is still alive. That causes:
    //   login → /dashboard → AuthGuard (detects stale token) → redirect to login
    // Instead, the login/signup pages handle "already authenticated" themselves
    // via a useEffect that checks the Redux auth state (which is authoritative).

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
