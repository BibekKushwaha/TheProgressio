import axios from "axios";
import getBuffer from "../utils/buffer.js";
import { prisma } from "@repo/db/client";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/tryCatch.js";
import bcrypt from 'bcrypt';
import { registerSchema, loginSchema } from "@repo/schemas/auth";

import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from "crypto";
// import { forgotPasswordTemplate } from "../templete.js";
// import { publishToTopic } from "../producer.js";
// import { redisClient } from "../index.js";

const ACCESS_TOKEN_TTL = process.env.MOBILE_ACCESS_TOKEN_TTL ?? "15m";
const MOBILE_REFRESH_TOKEN_DAYS = Number.parseInt(process.env.MOBILE_REFRESH_TOKEN_DAYS ?? "30", 10);

const ensureJwtSecret = (): string => {
  const secret = process.env.JWT_SEC;
  if (!secret) {
    throw new ErrorHandler(500, "JWT secret not configured");
  }
  return secret;
};

const issueAccessToken = (userId: string, options?: { expiresIn?: string }) => {
  const expiresIn = (options?.expiresIn ?? "15d") as NonNullable<SignOptions["expiresIn"]>;
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
  const decoded = jwt.verify(token, ensureJwtSecret()) as jwt.JwtPayload;
  if (!decoded?.id || typeof decoded.id !== "string") {
    throw new ErrorHandler(401, "Invalid token payload");
  }
  return { id: decoded.id };
};


export const registerUser = TryCatch(async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.flatten(),
    });
  }
  const { username, email, password } = result.data;

  let existingUser: any = null;
  try {
    existingUser = await prisma.user.findFirst({
      where: { email },
    });
  } catch (err) {
    console.error('Prisma findFirst error (register)', { email }, err);
    throw new ErrorHandler(500, 'Database error during user lookup');
  }


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
      whatsappOptIn: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      createdAt: true,
    },
  })
  if (!process.env.JWT_SEC) {
    throw new ErrorHandler(500, "JWT secret not configured");
  }
  const token = jwt.sign(
    { id: response?.id },
    process.env.JWT_SEC as string,
    {
      expiresIn: "15d",
    }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 15 * 24 * 60 * 60 * 1000,
  };

  res.cookie('token', token, cookieOptions);

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: response,
  });

});

export const loginUser = TryCatch(async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    console.error('[LOGIN] Validation error:', result.error.flatten());
    return res.status(400).json({
      message: 'Invalid email or password format',
      errors: result.error.flatten(),
    });
  }
  const { email, password } = result.data;

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
      },
    });
  } catch (err) {
    console.error('Prisma findUnique error (login)', { email }, err);
    if ((err as any)?.code === "P2022") {
      throw new ErrorHandler(500, "Database schema out of date. Run Prisma migrations and restart services.");
    }
    throw new ErrorHandler(500, 'Database error during user lookup');
  }

  if (!user) {
    throw new ErrorHandler(400, "Invalid credentials");
  }


  const matchPassword = await bcrypt.compare(password, user.password);

  if (!matchPassword) {
    throw new ErrorHandler(400, "Invalid credentials");
  }

  const token = issueAccessToken(user?.id);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 15 * 24 * 60 * 60 * 1000,
  };

  res.cookie('token', token, cookieOptions);

  // Remove password from user object before sending response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: "user Loggedin",
    user: userWithoutPassword,
  });
});

export const logoutUser = TryCatch(async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  res.clearCookie('token', cookieOptions);
  res.cookie('token', '', cookieOptions);

  res.json({
    message: 'User logged out successfully',
  });
});

export const getCurrentUser = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SEC as string);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const userId = decoded?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      dailyGoalHours: true,
      whatsappOptIn: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      createdAt: true
    },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ success: true, user });
});

export const updateProfile = TryCatch(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SEC as string);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const userId = decoded?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload' });
  }

  const { dailyGoalHours, username, email, whatsappOptIn, quietHoursStart, quietHoursEnd } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dailyGoalHours !== undefined && { dailyGoalHours: parseFloat(dailyGoalHours) }),
      ...(username && { username }),
      ...(email && { email }),
      ...(whatsappOptIn !== undefined && { whatsappOptIn: Boolean(whatsappOptIn) }),
      ...(quietHoursStart !== undefined && { quietHoursStart: quietHoursStart || null }),
      ...(quietHoursEnd !== undefined && { quietHoursEnd: quietHoursEnd || null }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      dailyGoalHours: true,
      whatsappOptIn: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      createdAt: true
    },
  });

  return res.json({
    success: true,
    message: "Profile updated successfully",
    user: updatedUser
  });
});

// ── Forgot Password (JWT-based, no Redis/Kafka required) ──────────────

export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: "Email is required" });
  }

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

  // TODO: Integrate with email service (Kafka/SMTP) to send resetLink.
  // For now, log it for development purposes.
  console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);

  return res.json({ message: "If that email exists, we have sent a reset link" });
});

export const resetPassword = TryCatch(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Reset token is required" });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

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

  return res.json({ message: "Password changed successfully" });
});

// ── Mobile Auth (refresh-token flow) ──────────────────────────────────

export const mobileLogin = TryCatch(async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid email or password format",
      errors: result.error.flatten(),
    });
  }

  const { email, password } = result.data;
  const deviceId = typeof req.body?.deviceId === "string" && req.body.deviceId.trim()
    ? req.body.deviceId.trim()
    : "unknown-device";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ErrorHandler(400, "Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new ErrorHandler(400, "Invalid credentials");
  }

  const accessToken = issueAccessToken(user.id, { expiresIn: ACCESS_TOKEN_TTL });
  const rawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + Math.max(1, MOBILE_REFRESH_TOKEN_DAYS) * 24 * 60 * 60 * 1000);

  await prisma.mobileRefreshToken.create({
    data: {
      userId: user.id,
      deviceId,
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
  const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
  const requestedDeviceId =
    typeof req.body?.deviceId === "string" && req.body.deviceId.trim()
      ? req.body.deviceId.trim()
      : null;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

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
  const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
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
    } catch {
      // If bearer token is invalid, continue with refresh-token based revocation only.
    }
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

  const label = typeof req.body?.label === "string" && req.body.label.trim()
    ? req.body.label.trim()
    : null;
  const permissions = typeof req.body?.permissions === "string" && req.body.permissions.trim()
    ? req.body.permissions.trim().toUpperCase()
    : "READ_ONLY";
  const expiresInDays = Number.parseInt(String(req.body?.expiresInDays ?? "14"), 10);
  const expiresAt = new Date(Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000);

  const shareToken = `fml_${generateOpaqueToken()}`;

  const link = await prisma.familyShareLink.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(shareToken),
      label,
      permissions,
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
