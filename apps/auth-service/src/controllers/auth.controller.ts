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

const ACCESS_TOKEN_TTL = process.env.MOBILE_ACCESS_TOKEN_TTL ?? "15s";
const MOBILE_REFRESH_TOKEN_DAYS = Number.parseInt(process.env.MOBILE_REFRESH_TOKEN_DAYS ?? "30", 10);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000,
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

const issueAccessToken = (userId: string, options?: { expiresIn?: string }) => {
  const expiresIn = (options?.expiresIn ?? "1h") as NonNullable<SignOptions["expiresIn"]>;
  const signOptions: SignOptions = { expiresIn };
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

async function issueWebSessionCookies(res: any, userId: string): Promise<void> {
  const token = issueAccessToken(userId, { expiresIn: "1h" });
  res.cookie('token', token, COOKIE_OPTIONS);

  const rawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);

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
      },
    }),
  ]);

  res.cookie('refreshToken', rawRefreshToken, REFRESH_COOKIE_OPTIONS);
}

const issueMobileSession = async (userId: string, deviceId?: string | null) => {
  const accessToken = issueAccessToken(userId, { expiresIn: ACCESS_TOKEN_TTL });
  const rawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);

  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      deviceId: deviceId?.trim() || "unknown-device",
      tokenHash: hashOpaqueToken(rawRefreshToken),
      expiresAt,
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
  await issueWebSessionCookies(res, user.id);

  return res.redirect(`${FRONTEND_BASE_URL}${next}`);
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
  const tokens = await issueMobileSession(user.id, deviceId);

  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, email: true, dailyGoalHours: true, createdAt: true, xp: true, level: true },
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
    const decoded = jwt.verify(token, ensureJwtSecret()) as jwt.JwtPayload;
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
    },
  });

  await issueWebSessionCookies(res, response.id);

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

  // Brute-force protection: block IPs/emails with > 5 failed attempts in 15 min
  const failKey = `login_fail:${email.toLowerCase()}`;
  const MAX_FAILURES = 5;
  const WINDOW_SECONDS = 15 * 60;
  try {
    const mod = (await import('@repo/cache').catch(() => null)) as any;
    if (mod?.getCache) {
      const failures = (await mod.getCache(failKey) as number | null) ?? 0;
      if (failures >= MAX_FAILURES) {
        return res.status(429).json({ message: 'Too many failed login attempts. Please try again later.' });
      }
    }
  } catch { /* non-blocking */ }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    // Increment failure counter
    try {
      const mod = (await import('@repo/cache').catch(() => null)) as any;
      if (mod?.getCache && mod?.setCache) {
        const prev = (await mod.getCache(failKey) as number | null) ?? 0;
        await mod.setCache(failKey, prev + 1, { ex: WINDOW_SECONDS });
      }
    } catch { /* non-blocking */ }
    throw new ErrorHandler(400, "Invalid credentials");
  }

  // Clear failure counter on success
  try {
    const mod = (await import('@repo/cache').catch(() => null)) as any;
    if (mod?.deleteCache) await mod.deleteCache(failKey);
  } catch { /* non-blocking */ }

  await issueWebSessionCookies(res, user.id);

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
  const existing = await prisma.mobileRefreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      deviceId: null,
    },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }

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
        deviceId: null,
        tokenHash: hashOpaqueToken(rotatedRefresh),
        expiresAt: nextExpiry,
      },
    }),
  ]);

  const token = issueAccessToken(existing.userId, { expiresIn: "1h" });
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
      level: true
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

// ── Forgot Password (JWT-based, uses BullMQ/Redis for email worker) ────────

import { addEmailToQueue } from "../services/email.queue.js";

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

  const resetToken = jwt.sign(
    { email: user.email, userId: user.id, type: "reset" },
    process.env.JWT_SEC as string,
    { expiresIn: "15m" }
  );

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset/${resetToken}`;

  // Integrate with email service via BullMQ
  await addEmailToQueue({
    to: email,
    subject: "Reset your password - Transition",
    body: `Follow this link to reset your password: ${resetLink}`,
    html: `<p>Please follow this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
  });

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

  let decoded: any;
  try {
    decoded = jwt.verify(token as string, process.env.JWT_SEC as string);
  } catch {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  if (decoded.type !== "reset" || !decoded.email) {
    return res.status(400).json({ message: "Invalid token type" });
  }

  const user = await prisma.user.findUnique({ where: { email: decoded.email } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const hashPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword },
  });

  // invalidate cache for this user (best-effort)
  try {
    await safeDeleteUserCache(user.id);
  } catch {
    // ignore
  }

  return res.json({ message: "Password changed successfully" });
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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ErrorHandler(400, "Invalid credentials");
  }

  const accessToken = issueAccessToken(user.id, { expiresIn: ACCESS_TOKEN_TTL });
  const rawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);

  await prisma.mobileRefreshToken.create({
    data: {
      userId: user.id,
      deviceId: resolvedDeviceId,
      tokenHash: hashOpaqueToken(rawRefreshToken),
      expiresAt,
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
  const existing = await prisma.mobileRefreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      ...(requestedDeviceId ? { deviceId: requestedDeviceId } : {}),
    },
    include: {
      user: {
        select: { id: true, username: true, email: true, dailyGoalHours: true, createdAt: true },
      },
    },
  });

  if (!existing) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

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
      },
    }),
  ]);

  const accessToken = issueAccessToken(existing.userId, { expiresIn: ACCESS_TOKEN_TTL });

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
