type SessionUser = {
  role?: string;
};

type SessionVerificationResult = {
  isAuthenticated: boolean;
  user: SessionUser | null;
  setCookieHeaders: string[];
};

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
  '/admin',
];

const PUBLIC_EXACT_PATHS = ['/login', '/signup', '/forgot-password'];
const PUBLIC_PREFIXES = ['/reset-password', '/family-connect/accept'];
const ADMIN_PREFIXES = ['/admin'];

export const getAuthServiceUrl = (): string =>
  process.env.AUTH_SERVICE_URL ??
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ??
  'http://localhost:4000';

export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_EXACT_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export const isProtectedPath = (pathname: string): boolean =>
  !isPublicPath(pathname) && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export const isAdminPath = (pathname: string): boolean =>
  ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const splitSetCookieHeader = (header: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let inExpires = false;

  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    const nextChunk = header.slice(index, index + 8).toLowerCase();

    if (nextChunk === 'expires=') {
      inExpires = true;
    }

    if (char === ',' && !inExpires) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;

    if (inExpires && char === ';') {
      inExpires = false;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.filter(Boolean);
};

const getSetCookieHeaders = (headers: Headers): string[] => {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === 'function') {
    return withGetSetCookie.getSetCookie();
  }

  const raw = headers.get('set-cookie');
  return raw ? splitSetCookieHeader(raw) : [];
};

const toCookiePair = (setCookieHeader: string): [string, string] | null => {
  const [pair] = setCookieHeader.split(';');
  if (!pair) return null;

  const separatorIndex = pair.indexOf('=');
  if (separatorIndex <= 0) return null;

  const name = pair.slice(0, separatorIndex).trim();
  const value = pair.slice(separatorIndex + 1).trim();
  if (!name) return null;

  return [name, value];
};

export const mergeCookieHeader = (cookieHeader: string, setCookieHeaders: string[]): string => {
  const cookies = new Map<string, string>();

  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex <= 0) return;
      cookies.set(part.slice(0, separatorIndex).trim(), part.slice(separatorIndex + 1).trim());
    });

  setCookieHeaders.forEach((header) => {
    const parsed = toCookiePair(header);
    if (!parsed) return;
    cookies.set(parsed[0], parsed[1]);
  });

  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

const fetchProfile = async (cookieHeader: string): Promise<Response> => {
  return fetch(`${getAuthServiceUrl()}/api/auth/me`, {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
      accept: 'application/json',
    },
    cache: 'no-store',
  });
};

const refreshSession = async (cookieHeader: string): Promise<Response> => {
  return fetch(`${getAuthServiceUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      cookie: cookieHeader,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    cache: 'no-store',
  });
};

export const verifyWebSession = async (cookieHeader: string): Promise<SessionVerificationResult> => {
  if (!cookieHeader.trim()) {
    return { isAuthenticated: false, user: null, setCookieHeaders: [] };
  }

  const initialProfileResponse = await fetchProfile(cookieHeader);
  if (initialProfileResponse.ok) {
    const body = (await initialProfileResponse.json()) as { user?: SessionUser };
    return {
      isAuthenticated: true,
      user: body.user ?? null,
      setCookieHeaders: [],
    };
  }

  if (!cookieHeader.includes('refreshToken=')) {
    return { isAuthenticated: false, user: null, setCookieHeaders: [] };
  }

  const refreshResponse = await refreshSession(cookieHeader);
  const refreshedCookieHeaders = getSetCookieHeaders(refreshResponse.headers);
  if (!refreshResponse.ok) {
    return {
      isAuthenticated: false,
      user: null,
      setCookieHeaders: refreshedCookieHeaders,
    };
  }

  const mergedCookieHeader = mergeCookieHeader(cookieHeader, refreshedCookieHeaders);
  const refreshedProfileResponse = await fetchProfile(mergedCookieHeader);
  if (!refreshedProfileResponse.ok) {
    return {
      isAuthenticated: false,
      user: null,
      setCookieHeaders: refreshedCookieHeaders,
    };
  }

  const body = (await refreshedProfileResponse.json()) as { user?: SessionUser };
  return {
    isAuthenticated: true,
    user: body.user ?? null,
    setCookieHeaders: refreshedCookieHeaders,
  };
};