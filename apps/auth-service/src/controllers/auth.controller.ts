import axios from "axios";
import getBuffer from "../utils/buffer.js";
import { prisma } from "@repo/db/client";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/tryCatch.js";
import bcrypt from 'bcrypt';
import { registerSchema, loginSchema } from "@repo/schemas/auth";

import jwt from 'jsonwebtoken';
// import { forgotPasswordTemplate } from "../templete.js";
// import { publishToTopic } from "../producer.js";
// import { redisClient } from "../index.js";


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
    });
  } catch (err) {
    console.error('Prisma findUnique error (login)', { email }, err);
    throw new ErrorHandler(500, 'Database error during user lookup');
  }

  if (!user) {
    throw new ErrorHandler(400, "Invalid credentials");
  }


  const matchPassword = await bcrypt.compare(password, user.password);

  if (!matchPassword) {
    throw new ErrorHandler(400, "Invalid credentials");
  }

  const token = jwt.sign(
    { id: user?.id },
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

  const { dailyGoalHours, username, email } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dailyGoalHours !== undefined && { dailyGoalHours: parseFloat(dailyGoalHours) }),
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
