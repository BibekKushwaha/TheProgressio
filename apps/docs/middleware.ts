import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    isAdminPath,
    isProtectedPath,
    verifyWebSession,
} from '@/lib/server-auth';

const REDIRECTABLE_AUTH_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password'];

const buildCookieHeader = (request: NextRequest): string => {
    return request.cookies
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ');
};

const appendSetCookieHeaders = (response: NextResponse, setCookieHeaders: string[]): NextResponse => {
    setCookieHeaders.forEach((header) => {
        response.headers.append('set-cookie', header);
    });
    return response;
};

const redirectToLogin = (request: NextRequest): NextResponse => {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
};

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = isProtectedPath(pathname);
    const isRedirectableAuthRoute = REDIRECTABLE_AUTH_PREFIXES.some((route) => pathname.startsWith(route));

    if (!isProtected && !isRedirectableAuthRoute) {
        return NextResponse.next();
    }

    const cookieHeader = buildCookieHeader(request);
    const hasSessionCookies = request.cookies.has('token') || request.cookies.has('refreshToken');

    if (!hasSessionCookies) {
        if (isProtected) {
            return redirectToLogin(request);
        }
        return NextResponse.next();
    }

    const session = await verifyWebSession(cookieHeader);

    if (!session.isAuthenticated) {
        if (isProtected) {
            return appendSetCookieHeaders(redirectToLogin(request), session.setCookieHeaders);
        }
        return appendSetCookieHeaders(NextResponse.next(), session.setCookieHeaders);
    }

    if (isAdminPath(pathname) && session.user?.role !== 'ADMIN') {
        return appendSetCookieHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), session.setCookieHeaders);
    }

    if (isRedirectableAuthRoute) {
        return appendSetCookieHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), session.setCookieHeaders);
    }

    return appendSetCookieHeaders(NextResponse.next(), session.setCookieHeaders);
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
