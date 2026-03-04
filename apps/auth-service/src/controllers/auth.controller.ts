import { prisma } from "@repo/db/client";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/tryCatch.js";
import bcrypt from 'bcrypt';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mobileLoginSchema,
  mobileRefreshSchema,
  mobileLogoutSchema,
  createFamilyShareLinkSchema,
} from "@repo/schemas/auth";

import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from "crypto";
import { addEmailToQueue } from "../services/email.queue.js";
// Lightweight local cache type (keeps auth-service independent from cache build artifacts)
export interface LocalUserCacheValue {
  id: string;
  username?: string | null;
  email?: string | null;
  dailyGoalHours?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  xp?: number;
  level?: number;
  role?: string;
}

async function safeGetUserCache(userId: string): Promise<LocalUserCacheValue | null> {
  try {
    const mod = (await import('@repo/cache').catch(() => null)) as any;
    if (!mod || typeof mod.getUserCache !== 'function') return null;
    return (await mod.getUserCache(userId)) as LocalUserCacheValue | null;
  } catch {
    return null;
  }
}

async function safeSetUserCache(userId: string, payload: LocalUserCacheValue, ttlSeconds?: number): Promise<void> {
  try {
    const mod = (await import('@repo/cache').catch(() => null)) as any;
    if (!mod || typeof mod.setUserCache !== 'function') return;
    await mod.setUserCache(userId, payload, ttlSeconds ?? undefined);
  } catch {
    // ignore cache errors
  }
}

async function safeDeleteUserCache(userId: string): Promise<void> {
  try {
    const mod = (await import('@repo/cache').catch(() => null)) as any;
    if (!mod || typeof mod.deleteUserCache !== 'function') return;
    await mod.deleteUserCache(userId);
  } catch {
    // ignore
  }
}
// import { forgotPasswordTemplate } from "../templete.js";
// import { publishToTopic } from "../producer.js";
// import { redisClient } from "../index.js";

// "15m" is the safe default for mobile access tokens — "15s" would cause
// near-constant forced refreshes in any real usage
const ACCESS_TOKEN_TTL = process.env.MOBILE_ACCESS_TOKEN_TTL ?? "15m";
const WEB_ACCESS_TOKEN_TTL = process.env.WEB_ACCESS_TOKEN_TTL ?? "1h";
const WEB_REFRESH_TOKEN_DAYS = Number.parseInt(process.env.WEB_REFRESH_TOKEN_DAYS ?? "7", 10);
const MOBILE_REFRESH_TOKEN_DAYS = Number.parseInt(process.env.MOBILE_REFRESH_TOKEN_DAYS ?? "7", 10);
// Absolute session cap: even with continuous refresh token rotation a session
// must end after this many days. Prevents infinite persistent sessions.
const ABSOLUTE_SESSION_DAYS = Number.parseInt(process.env.ABSOLUTE_SESSION_DAYS ?? "30", 10);
// Password reset tokens expire after this many minutes
const RESET_TOKEN_EXPIRY_MS = Number.parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES ?? "15", 10) * 60 * 1000;

// 'lax' instead of 'strict' so cookies are sent on top-level navigations
// (OAuth redirects, password-reset email links, etc.) without being blocked.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: Math.max(1, WEB_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000,
};

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs";
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"] as const;
const FRONTEND_BASE_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

const ensureJwtSecret = (): string => {
  const secret = process.env.JWT_SEC;
  if (!secret) {
    throw new ErrorHandler(500, "JWT secret not configured");
  }
  return secret;
};

const JWT_ISSUER = "transition-auth";
const JWT_WEB_AUDIENCE = "transition-web";
const JWT_MOBILE_AUDIENCE = "transition-mobile";

/**
 * Issues a short-lived access token with explicit issuer + audience claims.
 * Setting iss/aud prevents token confusion attacks where a token issued for
 * one service/client is replayed against another.
 */
const issueAccessToken = (
  userId: string,
  options?: { expiresIn?: string; audience?: string },
) => {
  const expiresIn = (options?.expiresIn ?? "15m") as NonNullable<SignOptions["expiresIn"]>;
  const audience = options?.audience ?? JWT_WEB_AUDIENCE;
  const signOptions: SignOptions = {
    expiresIn,
    issuer: JWT_ISSUER,
    audience,
  };
  return jwt.sign({ id: userId }, ensureJwtSecret(), signOptions);
};

const hashOpaqueToken = (raw: string): string =>
  crypto.createHash("sha256").update(raw).digest("hex");

const generateOpaqueToken = (): string =>
  crypto.randomBytes(48).toString("hex");

const isSafeNextPath = (nextValue: unknown): nextValue is string => {
  if (typeof nextValue !== "string") return false;
  if (!nextValue.startsWith("/")) return false;
  if (nextValue.startsWith("//")) return false;
  if (nextValue.includes("://")) return false;
  if (nextValue.includes("\\")) return false;
  return true;
};

const buildOAuthState = (payload: { next: string }): string => {
  return jwt.sign(
    {
      next: payload.next,
      nonce: crypto.randomBytes(16).toString("hex"),
      type: "oauth_state",
    },
    ensureJwtSecret(),
    { expiresIn: "10m" },
  );
};

const parseOAuthState = (raw: string): { next: string } => {
  try {
    const decoded = jwt.verify(raw, ensureJwtSecret()) as jwt.JwtPayload;
    if (decoded?.type !== "oauth_state") throw new ErrorHandler(401, "Invalid OAuth state");
    const next = decoded?.next;
    if (!isSafeNextPath(next)) throw new ErrorHandler(400, "Invalid next path");
    return { next };
  } catch (err) {
    if (err instanceof ErrorHandler) throw err;
    throw new ErrorHandler(401, "OAuth state expired or invalid");
  }
};

type GoogleIdPayload = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
};

let googleCertCache: { fetchedAtMs: number; maxAgeMs: number; certs: Record<string, string> } | null = null;

const fetchGoogleCerts = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  if (googleCertCache && now - googleCertCache.fetchedAtMs < googleCertCache.maxAgeMs) {
    return googleCertCache.certs;
  }

  const response = await fetch(GOOGLE_CERTS_URL, { method: "GET" });
  if (!response.ok) {
    throw new ErrorHandler(502, "Failed to fetch Google certs");
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number.parseInt(maxAgeMatch[1] ?? "0", 10) : 3600;
  const maxAgeMs = Math.max(60_000, maxAgeSeconds * 1000);

  const certs = (await response.json()) as Record<string, string>;
  googleCertCache = { fetchedAtMs: now, maxAgeMs, certs };
  return certs;
};

const verifyGoogleIdToken = async (idToken: string, expectedAudiences: string[]): Promise<GoogleIdPayload> => {
  if (expectedAudiences.length === 0) {
    throw new ErrorHandler(500, "Google OAuth audiences not configured");
  }
  const decoded = jwt.decode(idToken, { complete: true }) as { header?: { kid?: string } } | null;
  const kid = decoded?.header?.kid;
  if (!kid) {
    throw new ErrorHandler(401, "Invalid Google token header");
  }

  const certs = await fetchGoogleCerts();
  const cert = certs[kid];
  if (!cert) {
    googleCertCache = null;
    const fresh = await fetchGoogleCerts();
    if (!fresh[kid]) throw new ErrorHandler(401, "Unknown Google signing key");
    return verifyGoogleIdToken(idToken, expectedAudiences);
  }

  const payload = jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    audience: expectedAudiences as [string, ...string[]],
  }) as jwt.JwtPayload;

  const googlePayload = payload as unknown as GoogleIdPayload;
  if (!googlePayload.sub) throw new ErrorHandler(401, "Invalid Google token payload");
  if (!googlePayload.iss || !GOOGLE_ISSUERS.includes(googlePayload.iss as any)) {
    throw new ErrorHandler(401, "Invalid Google token issuer");
  }
  if (googlePayload.email_verified === false) throw new ErrorHandler(401, "Google email not verified");
  return googlePayload;
};

const generateUsernameFromEmail = (email: string): string => {
  const base = email.split("@")[0] ?? "user";
  const safe = base.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 16);
  return safe.length > 0 ? safe : "user";
};

const ensureUniqueUsername = async (desired: string): Promise<string> => {
  const base = desired.slice(0, 16) || "user";
  for (let i = 0; i < 10; i += 1) {
    const suffix = i === 0 ? "" : `_${crypto.randomBytes(2).toString("hex")}`;
    const candidate = `${base}${suffix}`.slice(0, 20);
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `${base}_${crypto.randomBytes(4).toString("hex")}`.slice(0, 20);
};

const resolveOrCreateGoogleUser = async (google: GoogleIdPayload): Promise<{ id: string }> => {
  const provider = "google";
  const providerAccountId = google.sub;
  const email = google.email?.toLowerCase();
  const prismaAny = prisma as any;

  const existingAccount = await prismaAny.oAuthAccount?.findFirst?.({
    where: { provider, providerAccountId },
    select: { userId: true },
  });

  if (existingAccount?.userId) {
    return { id: existingAccount.userId as string };
  }

  let user = null as null | { id: string };
  if (email) {
    user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  if (!user) {
    const usernameBase = email ? generateUsernameFromEmail(email) : "google_user";
    const username = await ensureUniqueUsername(usernameBase);
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashPassword = await bcrypt.hash(randomPassword, 10);

    user = await prisma.user.create({
      data: {
        username,
        email: email ?? `${providerAccountId}@google.local`,
        password: hashPassword,
      },
      select: { id: true },
    });
  }

  try {
    await prismaAny.oAuthAccount?.create?.({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
        email: email ?? null,
      },
    });
  } catch {
    /* ignore */
  }

  return { id: user.id };
};

// ── Device/Session fingerprinting helpers ─────────────────────────────────────

/** Extract real client IP, honouring X-Forwarded-For (set by reverse proxies). */
const getClientIp = (req: any): string => {
  if (!req) return '0.0.0.0';
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string') return (xff.split(',')[0] ?? xff).trim();
  return req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0';
};

/** Store only a short prefix of the SHA-256 hash (not the full raw IP). */
const hashIpForStorage = (ip: string): string =>
  crypto.createHash('sha256').update(`ip:${ip}`).digest('hex').slice(0, 16);

/** Store only a short prefix of the SHA-256 hash of the UA string. */
const hashUaForStorage = (ua: string): string =>
  crypto.createHash('sha256').update(`ua:${ua}`).digest('hex').slice(0, 16);

/**
 * Derive a human-readable device label from the User-Agent header.
 * Used for the session list UI ("Chrome on macOS", "Mobile App", etc.).
 */
const parseDeviceName = (ua: string): string => {
  if (!ua) return 'Unknown Device';
  const u = ua.toLowerCase();
  let os = 'Unknown OS';
  if (u.includes('windows')) os = 'Windows';
  else if (u.includes('macintosh') || u.includes('mac os x')) os = 'macOS';
  else if (u.includes('android')) os = 'Android';
  else if (u.includes('iphone') || u.includes('ipad')) os = 'iOS';
  else if (u.includes('linux')) os = 'Linux';

  let browser = 'Unknown Browser';
  if (u.includes('okhttp') || u.includes('expo') || u.includes('dart')) browser = 'Mobile App';
  else if (u.includes('postmanruntime')) browser = 'Postman';
  else if (u.includes('edg/') || u.includes('edge/')) browser = 'Edge';
  else if (u.includes('firefox/')) browser = 'Firefox';
  else if (u.includes('safari/') && !u.includes('chrome/')) browser = 'Safari';
  else if (u.includes('chrome/')) browser = 'Chrome';

  return `${browser} on ${os}`;
};

/** Fire-and-forget security alert email — never throws. */
async function sendSecurityAlert(email: string, eventType: string, details: string): Promise<void> {
  try {
    await addEmailToQueue({
      to: email,
      subject: `Security Alert: ${eventType} – Transition`,
      body: details,
      html: `<p><strong>Security Alert — ${eventType}</strong></p><p>${details}</p>` +
        `<p>If this wasn't you, please change your password and revoke all active sessions immediately.</p>`,
    });
  } catch (err) {
    console.error(`[SecurityAlert] Failed to send ${eventType} alert to ${email}:`, err);
  }
}

/**
 * Append an immutable row to the SecurityEvent table.
 * Fire-and-forget — a DB write failure here must never block the request.
 */
async function logSecurityEvent(opts: {
  userId?: string | null;
  eventType: string;
  req?: any;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        userId: opts.userId ?? null,
        eventType: opts.eventType,
        ipHash: opts.req ? hashIpForStorage(getClientIp(opts.req)) : null,
        uaHash: opts.req?.headers?.['user-agent']
          ? hashUaForStorage(opts.req.headers['user-agent'])
          : null,
        details: opts.details ? JSON.stringify(opts.details) : null,
      },
    });
  } catch (err) {
    console.error(`[SecurityEvent] Failed to log ${opts.eventType}:`, err);
  }
}

async function issueWebSessionCookies(res: any, userId: string, req?: any): Promise<void> {
  const token = issueAccessToken(userId, { expiresIn: WEB_ACCESS_TOKEN_TTL });
  res.cookie('token', token, COOKIE_OPTIONS);

  const rawRefreshToken = generateOpaqueToken();
  const now = Date.now();
  const expiresAt = new Date(now + Math.max(1, WEB_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(now + Math.max(1, ABSOLUTE_SESSION_DAYS) * 24 * 60 * 60 * 1000);

  const ip = getClientIp(req);
  const ua = req?.headers?.['user-agent'] ?? '';

  await prisma.$transaction([
    prisma.mobileRefreshToken.updateMany({
      where: { userId, deviceId: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.mobileRefreshToken.create({
      data: {
        userId,
        deviceId: null,
        tokenHash: hashOpaqueToken(rawRefreshToken),
        expiresAt,
        absoluteExpiresAt,
        deviceName: parseDeviceName(ua),
        ipHash: hashIpForStorage(ip),
        uaHash: hashUaForStorage(ua),
        lastSeenAt: new Date(),
      },
    }),
  ]);

  res.cookie('refreshToken', rawRefreshToken, REFRESH_COOKIE_OPTIONS);
}

const issueMobileSession = async (
  userId: string,
  deviceId?: string | null,
  meta?: { deviceName?: string; ipHash?: string; uaHash?: string },
) => {
  const accessToken = issueAccessToken(userId, { expiresIn: ACCESS_TOKEN_TTL, audience: JWT_MOBILE_AUDIENCE });
  const rawRefreshToken = generateOpaqueToken();
  const now = Date.now();
  const expiresAt = new Date(now + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(now + Math.max(1, ABSOLUTE_SESSION_DAYS) * 24 * 60 * 60 * 1000);

  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      deviceId: deviceId?.trim() || "unknown-device",
      tokenHash: hashOpaqueToken(rawRefreshToken),
      expiresAt,
      absoluteExpiresAt,
      deviceName: meta?.deviceName ?? 'Mobile App',
      ipHash: meta?.ipHash ?? null,
      uaHash: meta?.uaHash ?? null,
      lastSeenAt: new Date(),
    },
  });

  return { accessToken, refreshToken: rawRefreshToken, expiresAt: expiresAt.toISOString() };
};

export const googleLoginStart = TryCatch(async (req, res) => {
  const nextParam = isSafeNextPath(req.query?.next) ? (req.query.next as string) : "/dashboard";
  const state = buildOAuthState({ next: nextParam });

  const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_WEB_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new ErrorHandler(500, "Google OAuth not configured");
  }

  const authUrl = new URL(GOOGLE_OAUTH_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return res.redirect(authUrl.toString());
});

export const googleLoginCallback = TryCatch(async (req, res) => {
  const code = typeof req.query?.code === "string" ? req.query.code : null;
  const stateRaw = typeof req.query?.state === "string" ? req.query.state : null;
  const error = typeof req.query?.error === "string" ? req.query.error : null;

  if (error) {
    return res.redirect(`${FRONTEND_BASE_URL}/login?error=${encodeURIComponent(error)}`);
  }
  if (!code || !stateRaw) {
    throw new ErrorHandler(400, "Missing OAuth callback params");
  }

  const { next } = parseOAuthState(stateRaw);

  const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_WEB_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ErrorHandler(500, "Google OAuth not configured");
  }

  const body = new URLSearchParams();
  body.set("code", code);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("redirect_uri", redirectUri);
  body.set("grant_type", "authorization_code");

  const tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as any;
  if (!tokenRes.ok) {
    throw new ErrorHandler(401, tokenJson?.error_description ?? "Google token exchange failed");
  }

  const idToken = tokenJson?.id_token;
  if (typeof idToken !== "string") {
    throw new ErrorHandler(401, "Missing Google id_token");
  }

  const googlePayload = await verifyGoogleIdToken(idToken, [clientId]);
  const user = await resolveOrCreateGoogleUser(googlePayload);
  await issueWebSessionCookies(res, user.id, req);

  // Redirect to the OAuth callback bridge page instead of jumping directly to
  // the destination.  That page stamps `auth:hasSession=1` into localStorage
  // before forwarding — without it, AuthGuard never sees a session hint and
  // immediately bounces the user back to /login.
  const callbackUrl = `${FRONTEND_BASE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
  return res.redirect(callbackUrl);
});

export const mobileGoogleLogin = TryCatch(async (req, res) => {
  const idToken = typeof req.body?.idToken === "string" ? req.body.idToken : "";
  const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId : undefined;
  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  const androidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID;
  const audiences = [androidClientId, iosClientId].filter((v): v is string => Boolean(v && v.trim()));
  if (audiences.length === 0) {
    throw new ErrorHandler(500, "Google mobile OAuth not configured");
  }

  const googlePayload = await verifyGoogleIdToken(idToken, audiences);
  const user = await resolveOrCreateGoogleUser(googlePayload);
  const mobileUa = req.headers?.['user-agent'] ?? '';
  const tokens = await issueMobileSession(user.id, deviceId, {
    deviceName: parseDeviceName(mobileUa),
    ipHash: hashIpForStorage(getClientIp(req)),
    uaHash: hashUaForStorage(mobileUa),
  });

  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, email: true, dailyGoalHours: true, createdAt: true, xp: true, level: true, role: true },
  });

  return res.status(200).json({
    message: "Mobile Google login successful",
    user: userRow,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  });
});

const getBearerToken = (req: any): string | null => {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  return null;
};

const decodeAccessToken = (token: string): { id: string } => {
  try {
    // Validate issuer + audience to prevent token confusion attacks.
    // Accept both web and mobile audiences so a single validate function
    // works across all routes (mobile clients still hit the web /me endpoint).
    const decoded = jwt.verify(token, ensureJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: [JWT_WEB_AUDIENCE, JWT_MOBILE_AUDIENCE],
    }) as jwt.JwtPayload;
    if (!decoded?.id || typeof decoded.id !== "string") {
      throw new ErrorHandler(401, "Invalid token payload");
    }
    return { id: decoded.id };
  } catch (err) {
    if (err instanceof ErrorHandler) throw err;
    throw new ErrorHandler(401, "Token expired or invalid");
  }
};

const buildUserCachePayload = (user: any): LocalUserCacheValue => ({
  id: user.id,
  username: user.username ?? null,
  email: user.email ?? null,
  dailyGoalHours: user.dailyGoalHours ?? null,
  createdAt: user.createdAt ? (user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt) : null,
  updatedAt: user.updatedAt ? (user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt) : null,
  xp: user.xp ?? 0,
  level: user.level ?? 1,
  role: user.role ?? 'USER',
});


export const registerUser = TryCatch(async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: result.error.flatten()
    });
  }
  const { username, email, password } = result.data;

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    throw new ErrorHandler(409, "User with this email already exists");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const response = await prisma.user.create({
    data: {
      username,
      email,
      password: hashPassword
    },
    select: {
      id: true,
      username: true,
      email: true,
      dailyGoalHours: true,
      createdAt: true,
      xp: true,
      level: true,
      role: true,
    },
  });

  await issueWebSessionCookies(res, response.id, req);

  // best-effort cache
  await safeSetUserCache(response.id, buildUserCachePayload(response));

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: response,
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: 'Invalid email or password format',
      errors: result.error.flatten(),
    });
  }
  const { email, password } = result.data;

  // ── DB-backed account lockout (survives server restarts) ──────────────────
  const LOCKOUT_THRESHOLD = parseInt(process.env.LOGIN_LOCKOUT_THRESHOLD ?? '10', 10);
  const LOCKOUT_DURATION_MS = parseInt(process.env.LOGIN_LOCKOUT_DURATION_MINUTES ?? '15', 10) * 60 * 1000;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Constant-time dummy compare to prevent email-enumeration via timing
    await bcrypt.compare(password, '$2b$10$invalidhashpaddingtomakethisconstanttime0000000000000');
    void logSecurityEvent({ eventType: 'LOGIN_FAILED', req, details: { reason: 'user_not_found' } });
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Check if account is locked
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const retryAfterSecs = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
    void logSecurityEvent({ userId: user.id, eventType: 'LOGIN_FAILED', req, details: { reason: 'account_locked' } });
    return res.status(423).json({
      message: `Account temporarily locked. Try again in ${Math.ceil(retryAfterSecs / 60)} minute(s).`,
      retryAfter: retryAfterSecs,
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    const newCount = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newCount >= LOCKOUT_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newCount,
        ...(shouldLock ? { lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS) } : {}),
      },
    });
    void logSecurityEvent({ userId: user.id, eventType: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', req,
      details: { failedAttempts: newCount, locked: shouldLock } });
    if (shouldLock) {
      await sendSecurityAlert(
        user.email,
        'ACCOUNT_LOCKED',
        `Your account was temporarily locked after ${newCount} failed login attempts from IP: ${getClientIp(req)}.`,
      );
      return res.status(423).json({
        message: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
        retryAfter: LOCKOUT_DURATION_MS / 1000,
      });
    }
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Successful login — reset lockout state
  if ((user.failedLoginAttempts ?? 0) > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  void logSecurityEvent({ userId: user.id, eventType: 'LOGIN_SUCCESS', req });
  await issueWebSessionCookies(res, user.id, req);

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: "user Loggedin",
    user: userWithoutPassword,
  });

  await safeSetUserCache(user.id, buildUserCachePayload(user));
});

export const logoutUser = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload | null;
      const exp = decoded?.exp;
      const remaining = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 3600;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      // Blacklist the token so it cannot be reused after logout
      const mod = (await import('@repo/cache').catch(() => null)) as any;
      if (mod?.setCache) {
        await mod.setCache(`bl:${tokenHash}`, 1, { ex: remaining }).catch(() => null);
      }
      const { id } = decodeAccessToken(token);
      await safeDeleteUserCache(id);
    } catch { /* ignore */ }
  }

  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

  if (refreshToken && typeof refreshToken === 'string') {
    await prisma.mobileRefreshToken.updateMany({
      where: { tokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.json({ message: 'User logged out successfully' });
});

export const refreshUser = TryCatch(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(401).json({ message: 'Missing refresh token' });
  }

  const tokenHash = hashOpaqueToken(refreshToken);

  // Look up the token WITHOUT the revokedAt filter so we can detect reuse.
  const candidate = await prisma.mobileRefreshToken.findFirst({
    where: { tokenHash, deviceId: null },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true, absoluteExpiresAt: true, uaHash: true, ipHash: true, deviceName: true },
  });

  if (!candidate) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  // ── Refresh Token Reuse Detection ─────────────────────────────────────────
  if (candidate.revokedAt !== null) {
    console.warn(`[Security] Refresh token reuse detected for user ${candidate.userId}. Revoking all sessions.`);
    await prisma.mobileRefreshToken.updateMany({
      where: { userId: candidate.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const reuseUser = await prisma.user.findUnique({ where: { id: candidate.userId }, select: { email: true } });
    if (reuseUser?.email) {
      await sendSecurityAlert(reuseUser.email, 'REFRESH_TOKEN_REUSE',
        `A session refresh was attempted with a token that had already been rotated. ` +
        `All your sessions have been invalidated as a precaution. IP: ${getClientIp(req)}.`);
    }
    void logSecurityEvent({ userId: candidate.userId, eventType: 'REFRESH_TOKEN_REUSE', req });
    res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    return res.status(401).json({ message: 'Session invalidated. Please log in again.' });
  }

  if (candidate.expiresAt <= new Date()) {
    return res.status(401).json({ message: 'Refresh token expired' });
  }

  // ── Absolute Session Lifetime Cap ─────────────────────────────────────────
  // Prevent indefinite session renewal even with rolling refresh tokens.
  const nowWeb = new Date();
  if (candidate.absoluteExpiresAt && candidate.absoluteExpiresAt <= nowWeb) {
    res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    return res.status(401).json({ message: 'Session lifetime exceeded. Please log in again.' });
  }
  // Carry forward, never reset the session clock on rotation
  const inheritedWebAbsoluteExpiry = candidate.absoluteExpiresAt
    ?? new Date(Date.now() + ABSOLUTE_SESSION_DAYS * 24 * 60 * 60 * 1000);

  // ── Suspicious activity: User-Agent change detection ─────────────────────
  const currentWebUa = req?.headers?.['user-agent'] ?? '';
  const currentWebIp = getClientIp(req);
  const currentWebUaHash = hashUaForStorage(currentWebUa);
  const currentWebIpHash = hashIpForStorage(currentWebIp);

  if (candidate.uaHash && candidate.uaHash !== currentWebUaHash) {
    console.warn(`[Security] Web session UA change detected for user ${candidate.userId}`);
    const uaUser = await prisma.user.findUnique({ where: { id: candidate.userId }, select: { email: true } });
    if (uaUser?.email) {
      await sendSecurityAlert(uaUser.email, 'SUSPICIOUS_SESSION',
        `A session refresh was detected from a different browser or device than when the session was created. ` +
        `IP: ${currentWebIp}. If this was not you, revoke all sessions immediately.`);
    }
  }

  const existing = candidate;

  const rotatedRefresh = generateOpaqueToken();
  const nextExpiry = new Date(Date.now() + Math.max(1, WEB_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.mobileRefreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
    prisma.mobileRefreshToken.create({
      data: {
        userId: existing.userId,
        deviceId: null,
        tokenHash: hashOpaqueToken(rotatedRefresh),
        expiresAt: nextExpiry,
        absoluteExpiresAt: inheritedWebAbsoluteExpiry,
        deviceName: candidate.deviceName ?? parseDeviceName(currentWebUa),
        ipHash: currentWebIpHash,
        uaHash: currentWebUaHash,
        lastSeenAt: new Date(),
      },
    }),
  ]);

  const token = issueAccessToken(existing.userId, { expiresIn: WEB_ACCESS_TOKEN_TTL });
  res.cookie('token', token, COOKIE_OPTIONS);
  res.cookie('refreshToken', rotatedRefresh, REFRESH_COOKIE_OPTIONS);

  return res.status(200).json({ message: 'Token refreshed' });
});

export const getCurrentUser = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { id: userId } = decodeAccessToken(token);

  const cached = await safeGetUserCache(userId);
  if (cached) {
    return res.json({ success: true, user: cached });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      dailyGoalHours: true,
      whatsappNumber: true,
      whatsappVerified: true,
      createdAt: true,
      xp: true,
      level: true,
      role: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await safeSetUserCache(user.id, buildUserCachePayload(user));

  return res.json({ success: true, user });
});

export const getWhatsAppPairingCode = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) throw new ErrorHandler(401, 'Unauthorized');

  const { id: userId } = decodeAccessToken(token);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { whatsappPairingCode: true, whatsappVerified: true, whatsappNumber: true }
  });

  if (!user) throw new ErrorHandler(404, 'User not found');

  if (user.whatsappVerified) {
    return res.json({ success: true, verified: true, whatsappNumber: user.whatsappNumber });
  }

  let code = user.whatsappPairingCode;
  if (!code) {
    code = `PAIR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await prisma.user.update({
      where: { id: userId },
      data: { whatsappPairingCode: code }
    });
  }

  return res.json({ success: true, pairingCode: code, verified: false });
});

export const unpairWhatsApp = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) throw new ErrorHandler(401, 'Unauthorized');

  const { id: userId } = decodeAccessToken(token);

  await prisma.user.update({
    where: { id: userId },
    data: {
      whatsappNumber: null,
      whatsappVerified: false,
      whatsappPairingCode: null
    }
  });

  return res.json({ success: true, message: 'WhatsApp unpaired successfully' });
});

/**
 * POST /whatsapp/webhook
 * Called by the WhatsApp bot when a user sends their pairing code.
 * Body: { pairingCode: string, phoneNumber: string, botSecret?: string }
 * Marks the user as verified and stores their WhatsApp number.
 */
export const verifyWhatsAppWebhook = TryCatch(async (req, res) => {
  const { pairingCode, phoneNumber, botSecret } = req.body as {
    pairingCode: string;
    phoneNumber: string;
    botSecret?: string;
  };

  // Optional shared secret to protect the webhook from unauthorised callers
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (expectedSecret && botSecret !== expectedSecret) {
    throw new ErrorHandler(403, 'Invalid webhook secret');
  }

  if (!pairingCode || !phoneNumber) {
    throw new ErrorHandler(400, 'pairingCode and phoneNumber are required');
  }

  const user = await prisma.user.findUnique({
    where: { whatsappPairingCode: pairingCode },
    select: { id: true, whatsappVerified: true },
  });

  if (!user) throw new ErrorHandler(404, 'No user found for this pairing code');
  if (user.whatsappVerified) {
    return res.json({ success: true, message: 'Already verified' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      whatsappVerified: true,
      whatsappNumber: phoneNumber,
      whatsappPairingCode: null,  // invalidate code after use
    },
  });

  return res.json({ success: true, message: 'WhatsApp verified successfully' });
});

export const updateProfile = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { id: userId } = decodeAccessToken(token);

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid profile payload",
      errors: parsed.error.flatten(),
    });
  }

  const { dailyGoalHours, username, email } = parsed.data;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dailyGoalHours !== undefined && { dailyGoalHours }),
      ...(username && { username }),
      ...(email && { email }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      dailyGoalHours: true,
      createdAt: true
    },
  });

  await safeSetUserCache(updatedUser.id, buildUserCachePayload(updatedUser));

  return res.json({
    success: true,
    message: "Profile updated successfully",
    user: updatedUser
  });
});

export const exportAccountData = TryCatch(async (req, res) => {
  const token = req.cookies?.token ?? getBearerToken(req);
  if (!token) {
    throw new ErrorHandler(401, "Not authenticated");
  }

  const { id: userId } = decodeAccessToken(token);

  const userExport = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      whatsappNumber: true,
      whatsappVerified: true,
      dailyGoalHours: true,
      plan: true,
      planStatus: true,
      renewalAt: true,
      paymentProvider: true,
      paymentRef: true,
      createdAt: true,
      xp: true,
      level: true,

      categories: true,
      tasks: {
        include: {
          subtasks: true,
          attachments: true,
          activityLogs: true,
          reminders: true,
          category: true,
          subject: true,
        },
      },
      habits: {
        include: {
          logs: true,
          reminders: true,
        },
      },
      nudges: true,
      gradeEntries: true,
      courseGrades: true,
      paymentEvents: true,
      syncOperations: true,
      attendance: true,

      subjects: true,
      exams: true,
      studyGoals: true,
      timetable: true,
      rotationPatterns: true,
      holidays: true,

      achievements: true,
      notes: true,
      auditLogs: true,
      conversations: true,

      familyShareLinks: {
        select: {
          id: true,
          label: true,
          permissions: true,
          expiresAt: true,
          revokedAt: true,
          lastUsedAt: true,
          createdAt: true,
        },
      },
      pushSubscriptions: {
        select: {
          id: true,
          endpoint: true,
          userAgent: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      oauthAccounts: true,
    },
  });

  if (!userExport) {
    throw new ErrorHandler(404, "User not found");
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: userExport,
  };

  return res.status(200).json({ message: "Account export generated", export: payload });
});

export const deleteAccount = TryCatch(async (req, res) => {
  const token = req.cookies?.token ?? getBearerToken(req);
  if (!token) {
    throw new ErrorHandler(401, "Not authenticated");
  }

  const parsedConfirm = typeof req.body?.confirm === "string" ? req.body.confirm.trim() : "";
  if (parsedConfirm !== "DELETE") {
    throw new ErrorHandler(400, 'Confirmation required. Send {"confirm":"DELETE"}');
  }

  const { id: userId } = decodeAccessToken(token);

  await prisma.user.delete({ where: { id: userId } }).catch((_err) => {
    throw new ErrorHandler(404, "User not found");
  });

  await safeDeleteUserCache(userId);

  // Clear cookies to end the session immediately.
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

  return res.status(200).json({ message: "Account deleted" });
});

// ── Forgot Password (DB-backed opaque token, delivers via email queue) ──────────

export const forgotPassword = TryCatch(async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Email is required",
      errors: parsed.error.flatten(),
    });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: "If that email exists, we have sent a reset link" });
  }

  // ── Opaque, single-use, DB-backed reset token ───────────────────────────
  const rawResetToken = generateOpaqueToken();
  const resetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  // Invalidate any existing unused tokens for this user (one active link at a time)
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(rawResetToken),
      expiresAt: resetExpiresAt,
    },
  });

  void logSecurityEvent({ userId: user.id, eventType: 'PASSWORD_RESET_REQUESTED', req });

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${rawResetToken}`;

  // Fire-and-forget: never let email delivery failure surface as a 500
  try {
    await addEmailToQueue({
      to: email,
      subject: "Reset your password - Transition",
      body: `Follow this link to reset your password: ${resetLink}`,
      html: `<p>Please follow this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    });
  } catch (emailErr) {
    // Log but do NOT expose SMTP errors to the client
    console.error(`[ForgotPassword] Failed to send reset email to ${email}:`, emailErr);
  }

  return res.json({ message: "If that email exists, we have sent a reset link" });
});

export const resetPassword = TryCatch(async (req, res) => {
  const { token } = req.params;
  const parsed = resetPasswordSchema.safeParse(req.body);

  if (!token) {
    return res.status(400).json({ message: "Reset token is required" });
  }

  if (!parsed.success) {
    return res.status(400).json({
      message: "Password must be at least 6 characters",
      errors: parsed.error.flatten(),
    });
  }

  const { password } = parsed.data;

  // ── DB-backed opaque token lookup ────────────────────────────────────────
  const tokenHash = hashOpaqueToken(token as string);
  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!resetRecord) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }
  if (resetRecord.usedAt !== null) {
    return res.status(400).json({ message: 'Reset token has already been used' });
  }
  if (resetRecord.expiresAt <= new Date()) {
    return res.status(400).json({ message: 'Reset token has expired' });
  }

  const { user } = resetRecord;

  const hashPassword = await bcrypt.hash(password, 10);

  // Mark token as used and update password atomically
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashPassword },
    }),
    // Revoke all active web/mobile sessions so stolen-password sessions are killed
    prisma.mobileRefreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  // invalidate cache for this user (best-effort)
  try {
    await safeDeleteUserCache(user.id);
  } catch {
    // ignore
  }

  void logSecurityEvent({ userId: user.id, eventType: 'PASSWORD_CHANGED', req });

  return res.json({ message: 'Password changed successfully' });
});

// ── Mobile Auth (refresh-token flow) ──────────────────────────────────

export const mobileLogin = TryCatch(async (req, res) => {
  const result = mobileLoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid email or password format",
      errors: result.error.flatten(),
    });
  }

  const { email, password, deviceId } = result.data;
  const resolvedDeviceId = deviceId?.trim() || "unknown-device";

  // ── DB-backed account lockout ─────────────────────────────────────────────
  const LOCKOUT_THRESHOLD = parseInt(process.env.LOGIN_LOCKOUT_THRESHOLD ?? '10', 10);
  const LOCKOUT_DURATION_MS = parseInt(process.env.LOGIN_LOCKOUT_DURATION_MINUTES ?? '15', 10) * 60 * 1000;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await bcrypt.compare(password, '$2b$10$invalidhashpaddingtomakethisconstanttime0000000000000');
    void logSecurityEvent({ eventType: 'LOGIN_FAILED', req, details: { reason: 'user_not_found', platform: 'mobile' } });
    throw new ErrorHandler(400, "Invalid credentials");
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const retryAfterSecs = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
    void logSecurityEvent({ userId: user.id, eventType: 'LOGIN_FAILED', req, details: { reason: 'account_locked', platform: 'mobile' } });
    return res.status(423).json({
      message: `Account temporarily locked. Try again in ${Math.ceil(retryAfterSecs / 60)} minute(s).`,
      retryAfter: retryAfterSecs,
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    const newCount = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newCount >= LOCKOUT_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newCount,
        ...(shouldLock ? { lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS) } : {}),
      },
    });
    void logSecurityEvent({ userId: user.id, eventType: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', req,
      details: { failedAttempts: newCount, locked: shouldLock, platform: 'mobile' } });
    if (shouldLock) {
      await sendSecurityAlert(user.email, 'ACCOUNT_LOCKED',
        `Your account was temporarily locked after ${newCount} failed login attempts. IP: ${getClientIp(req)}.`);
      return res.status(423).json({
        message: 'Account temporarily locked. Please try again in 15 minutes.',
        retryAfter: LOCKOUT_DURATION_MS / 1000,
      });
    }
    throw new ErrorHandler(400, "Invalid credentials");
  }

  // Successful login — reset lockout state
  if ((user.failedLoginAttempts ?? 0) > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  void logSecurityEvent({ userId: user.id, eventType: 'LOGIN_SUCCESS', req, details: { platform: 'mobile' } });

  const mobileLoginUa = req.headers?.['user-agent'] ?? '';
  const accessToken = issueAccessToken(user.id, { expiresIn: ACCESS_TOKEN_TTL, audience: JWT_MOBILE_AUDIENCE });
  const rawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);
  const mobileAbsoluteExpiresAt = new Date(Date.now() + ABSOLUTE_SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.mobileRefreshToken.create({
    data: {
      userId: user.id,
      deviceId: resolvedDeviceId,
      tokenHash: hashOpaqueToken(rawRefreshToken),
      expiresAt,
      absoluteExpiresAt: mobileAbsoluteExpiresAt,
      deviceName: parseDeviceName(mobileLoginUa),
      ipHash: hashIpForStorage(getClientIp(req)),
      uaHash: hashUaForStorage(mobileLoginUa),
      lastSeenAt: new Date(),
    },
  });

  const { password: _password, ...safeUser } = user;

  return res.status(200).json({
    message: "Mobile login successful",
    user: safeUser,
    accessToken,
    refreshToken: rawRefreshToken,
    expiresAt: expiresAt.toISOString(),
  });
});

export const mobileRefresh = TryCatch(async (req, res) => {
  const parsed = mobileRefreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "refreshToken is required",
      errors: parsed.error.flatten(),
    });
  }

  const { refreshToken, deviceId } = parsed.data;
  const requestedDeviceId = deviceId?.trim() || null;

  const tokenHash = hashOpaqueToken(refreshToken);

  // Look up WITHOUT revokedAt filter to enable reuse detection
  const candidate = await prisma.mobileRefreshToken.findFirst({
    where: {
      tokenHash,
      ...(requestedDeviceId ? { deviceId: requestedDeviceId } : {}),
    },
    include: {
      user: {
        select: { id: true, username: true, email: true, dailyGoalHours: true, createdAt: true, role: true },
      },
    },
  });

  if (!candidate) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  // ── Refresh Token Reuse Detection ────────────────────────────────────────
  if (candidate.revokedAt !== null) {
    console.warn(`[Security] Mobile refresh token reuse for user ${candidate.userId} / device ${candidate.deviceId}. Revoking all sessions.`);
    await prisma.mobileRefreshToken.updateMany({
      where: { userId: candidate.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.status(401).json({ message: "Session invalidated. Please log in again." });
  }

  if (candidate.expiresAt <= new Date()) {
    return res.status(401).json({ message: "Refresh token expired" });
  }

  // ── Absolute Session Lifetime Cap ─────────────────────────────────────────
  const nowMobile = new Date();
  if (candidate.absoluteExpiresAt && candidate.absoluteExpiresAt <= nowMobile) {
    return res.status(401).json({ message: 'Session lifetime exceeded. Please log in again.' });
  }
  const inheritedMobileAbsoluteExpiry = candidate.absoluteExpiresAt
    ?? new Date(Date.now() + ABSOLUTE_SESSION_DAYS * 24 * 60 * 60 * 1000);

  // ── Suspicious activity: User-Agent / IP change detection ─────────────────
  const currentMobUa = req?.headers?.['user-agent'] ?? '';
  const currentMobIp = getClientIp(req);
  const currentMobUaHash = hashUaForStorage(currentMobUa);
  const currentMobIpHash = hashIpForStorage(currentMobIp);

  if (candidate.uaHash && candidate.uaHash !== currentMobUaHash) {
    console.warn(`[Security] Mobile session UA change for user ${candidate.userId} / device ${candidate.deviceId}`);
    if (candidate.user?.email) {
      await sendSecurityAlert(candidate.user.email, 'SUSPICIOUS_SESSION',
        `A mobile refresh was detected from a different device/app than the original session. ` +
        `Device: ${candidate.deviceId ?? 'unknown'}. IP: ${currentMobIp}.`);
    }
  }

  const existing = candidate;

  const rotatedRefresh = generateOpaqueToken();
  const nextExpiry = new Date(Date.now() + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.mobileRefreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
    prisma.mobileRefreshToken.create({
      data: {
        userId: existing.userId,
        deviceId: existing.deviceId,
        tokenHash: hashOpaqueToken(rotatedRefresh),
        expiresAt: nextExpiry,
        absoluteExpiresAt: inheritedMobileAbsoluteExpiry,
        deviceName: candidate.deviceName ?? parseDeviceName(currentMobUa),
        ipHash: currentMobIpHash,
        uaHash: currentMobUaHash,
        lastSeenAt: new Date(),
      },
    }),
  ]);

  const accessToken = issueAccessToken(existing.userId, { expiresIn: ACCESS_TOKEN_TTL, audience: JWT_MOBILE_AUDIENCE });

  return res.status(200).json({
    message: "Token refreshed",
    user: existing.user,
    accessToken,
    refreshToken: rotatedRefresh,
    expiresAt: nextExpiry.toISOString(),
  });
});

export const mobileLogout = TryCatch(async (req, res) => {
  const parsed = mobileLogoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid logout payload",
      errors: parsed.error.flatten(),
    });
  }

  const refreshToken = parsed.data.refreshToken ?? "";
  const authToken = getBearerToken(req);

  const operations = [];
  if (refreshToken) {
    operations.push(
      prisma.mobileRefreshToken.updateMany({
        where: { tokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      })
    );
  }

  if (authToken) {
    try {
      const { id } = decodeAccessToken(authToken);
      operations.push(
        prisma.mobileRefreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      );
      await safeDeleteUserCache(id);
    } catch { /* ignore */ }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return res.status(200).json({ message: "Mobile logout successful" });
});

export const mobileMe = TryCatch(async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  const { id } = decodeAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      dailyGoalHours: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({ message: "Mobile user profile", user });
});

// ── Family / Mentor Share Links ───────────────────────────────────────

const getCookieAuthenticatedUserId = (req: any): string | null => {
  const token = req.cookies?.token;
  if (!token || typeof token !== "string") return null;

  try {
    const decoded = decodeAccessToken(token);
    return decoded.id;
  } catch {
    return null;
  }
};

export const createFamilyShareLink = TryCatch(async (req, res) => {
  const userId = getCookieAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const parsed = createFamilyShareLinkSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid family share link payload",
      errors: parsed.error.flatten(),
    });
  }

  const { label, permissions, expiresInDays } = parsed.data;
  const resolvedLabel = label?.trim() || null;
  const resolvedPermissions = permissions?.trim().toUpperCase() || "READ_ONLY";
  const expiresAt = new Date(Date.now() + Math.max(1, expiresInDays ?? 14) * 24 * 60 * 60 * 1000);

  const shareToken = `fml_${generateOpaqueToken()}`;

  const link = await prisma.familyShareLink.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(shareToken),
      label: resolvedLabel,
      permissions: resolvedPermissions,
      expiresAt,
    },
  });

  return res.status(201).json({
    message: "Family share link created",
    link: {
      id: link.id,
      label: link.label,
      permissions: link.permissions,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      revokedAt: link.revokedAt,
    },
    shareToken,
  });
});

export const listFamilyShareLinks = TryCatch(async (req, res) => {
  const userId = getCookieAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const links = await prisma.familyShareLink.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });

  return res.status(200).json({
    message: "Family share links fetched",
    links,
  });
});

export const revokeFamilyShareLink = TryCatch(async (req, res) => {
  const userId = getCookieAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const id = req.params?.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid share link id" });
  }

  const result = await prisma.familyShareLink.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    return res.status(404).json({ message: "Share link not found" });
  }

  return res.status(200).json({ message: "Share link revoked" });
});

export const resolveFamilyShareLink = TryCatch(async (req, res) => {
  const rawToken = req.params?.token;
  if (!rawToken || typeof rawToken !== "string") {
    return res.status(400).json({ message: "Invalid share token" });
  }

  const tokenHash = hashOpaqueToken(rawToken);
  const link = await prisma.familyShareLink.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      userId: true,
      label: true,
      permissions: true,
      expiresAt: true,
    },
  });

  if (!link) {
    return res.status(404).json({ message: "Share link is invalid or expired" });
  }

  await prisma.familyShareLink.update({
    where: { id: link.id },
    data: { lastUsedAt: new Date() },
  });

  return res.status(200).json({
    message: "Share token resolved",
    link,
  });
});

// ── Device-Aware Session Management ──────────────────────────────────────────

/**
 * GET /api/auth/sessions
 * Returns all active (non-revoked, non-expired) sessions for the authenticated
 * user. Used to display the "active sessions" list in account settings.
 */
export const listSessions = TryCatch(async (req, res) => {
  const token = req.cookies?.token ?? getBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  const { id: userId } = decodeAccessToken(token);
  const currentRefreshToken = req.cookies?.refreshToken;
  const currentHash = currentRefreshToken ? hashOpaqueToken(currentRefreshToken) : null;

  const now = new Date();
  const sessions = await prisma.mobileRefreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      ipHash: true,
      tokenHash: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      absoluteExpiresAt: true,
    },
    orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
  });

  return res.json({
    success: true,
    sessions: sessions.map(s => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName ?? 'Unknown Device',
      ipHint: s.ipHash ? `\u2022\u2022\u2022\u2022${s.ipHash.slice(-4)}` : null,
      isCurrentSession: Boolean(currentHash && s.tokenHash === currentHash),
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
      expiresAt: s.expiresAt.toISOString(),
      absoluteExpiresAt: s.absoluteExpiresAt?.toISOString() ?? null,
    })),
  });
});

/**
 * DELETE /api/auth/sessions/:id
 * Revokes a specific session by its MobileRefreshToken ID.
 * Users can only revoke their own sessions.
 */
export const revokeSession = TryCatch(async (req, res) => {
  const token = req.cookies?.token ?? getBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  const { id: userId } = decodeAccessToken(token);
  const sessionId = typeof req.params?.id === 'string' ? req.params.id : null;
  if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });

  const session = await prisma.mobileRefreshToken.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (session.revokedAt !== null) return res.status(410).json({ message: 'Session already revoked' });

  await prisma.mobileRefreshToken.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  void logSecurityEvent({ userId, eventType: 'SESSION_REVOKED', req, details: { sessionId, deviceName: session.deviceName ?? null } });

  return res.json({ success: true, message: 'Session revoked successfully' });
});

/**
 * DELETE /api/auth/sessions
 * Revokes ALL active sessions for the current user (web + mobile).
 * Clears web cookies as well so the current browser session ends.
 */
export const logoutAllDevices = TryCatch(async (req, res) => {
  const token = req.cookies?.token ?? getBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  const { id: userId } = decodeAccessToken(token);

  const result = await prisma.mobileRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

  void logSecurityEvent({ userId, eventType: 'LOGOUT_ALL_DEVICES', req, details: { sessionsRevoked: result.count } });

  await safeDeleteUserCache(userId);

  return res.json({ success: true, message: `${result.count} session(s) revoked`, count: result.count });
});

// ─── Admin bootstrap ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/admin/promote
 *
 * Promotes an existing registered user to the ADMIN role.
 * Requires the request header `x-admin-bootstrap-secret` to match
 * the server-side env var `ADMIN_BOOTSTRAP_SECRET`.
 *
 * SECURITY: This endpoint is intentionally NOT protected by normal auth
 * middleware — it uses the bootstrap secret instead, so it can be called
 * before any admin exists in the system.  The secret must be long, random,
 * and kept out of version control.
 *
 * Flow for creating the first admin:
 *   1. Register a normal user  →  POST /api/auth/register
 *   2. Call this endpoint      →  POST /api/auth/admin/promote
 *   3. The user's role is set to "ADMIN" in the DB and cache is cleared
 *
 * Body:   { "email": "user@example.com" }
 * Header: x-admin-bootstrap-secret: <ADMIN_BOOTSTRAP_SECRET>
 */
export const promoteToAdmin = TryCatch(async (req, res) => {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) {
    return res.status(503).json({
      message: 'Admin bootstrap is not configured. Set ADMIN_BOOTSTRAP_SECRET env var.',
    });
  }

  const provided = req.headers['x-admin-bootstrap-secret'];
  if (!provided || provided !== secret) {
    return res.status(403).json({ message: 'Invalid or missing x-admin-bootstrap-secret header.' });
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'email is required in the request body.' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, role: true },
  });
  if (!user) {
    return res.status(404).json({
      message: 'User not found. Register the account normally first, then promote it.',
    });
  }

  if (user.role === 'ADMIN') {
    return res.json({ message: `${email} is already an ADMIN.`, userId: user.id });
  }

  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  await safeDeleteUserCache(user.id);

  return res.status(200).json({
    message: `${email} has been promoted to ADMIN.`,
    userId: user.id,
    username: user.username,
  });
});

/**
 * POST /api/auth/admin/demote
 *
 * Reverts an ADMIN back to the USER role.
 * Same secret-header protection as /admin/promote.
 *
 * Body:   { "email": "admin@example.com" }
 * Header: x-admin-bootstrap-secret: <ADMIN_BOOTSTRAP_SECRET>
 */
export const demoteFromAdmin = TryCatch(async (req, res) => {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) {
    return res.status(503).json({
      message: 'Admin bootstrap is not configured. Set ADMIN_BOOTSTRAP_SECRET env var.',
    });
  }

  const provided = req.headers['x-admin-bootstrap-secret'];
  if (!provided || provided !== secret) {
    return res.status(403).json({ message: 'Invalid or missing x-admin-bootstrap-secret header.' });
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'email is required in the request body.' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, role: true },
  });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.role !== 'ADMIN') {
    return res.json({ message: `${email} is not an ADMIN.`, userId: user.id });
  }

  await prisma.user.update({ where: { email }, data: { role: 'USER' } });
  await safeDeleteUserCache(user.id);

  return res.status(200).json({
    message: `${email} has been demoted to USER.`,
    userId: user.id,
    username: user.username,
  });
});
