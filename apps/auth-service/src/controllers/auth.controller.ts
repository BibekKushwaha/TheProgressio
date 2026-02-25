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

const ACCESS_TOKEN_TTL = process.env.MOBILE_ACCESS_TOKEN_TTL ?? "15m";
const MOBILE_REFRESH_TOKEN_DAYS = Number.parseInt(process.env.MOBILE_REFRESH_TOKEN_DAYS ?? "30", 10);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};

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

  const token = issueAccessToken(response.id);
  res.cookie('token', token, COOKIE_OPTIONS);

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

  const token = issueAccessToken(user.id);
  res.cookie('token', token, COOKIE_OPTIONS);

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: "user Loggedin",
    user: userWithoutPassword,
  });

  await safeSetUserCache(user.id, buildUserCachePayload(user));
});

export const logoutUser = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
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
  res.json({ message: 'User logged out successfully' });
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
