import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"), // Don't need min(8) here to allow flexibility
});

export const updateProfileSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  dailyGoalHours: z.coerce.number().min(0).max(24).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const mobileLoginSchema = loginSchema.extend({
  deviceId: z.string().min(1).max(200).optional(),
});

export const mobileRefreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
  deviceId: z.string().min(1).max(200).optional(),
});

export const mobileLogoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const createFamilyShareLinkSchema = z.object({
  label: z.string().max(120).optional(),
  permissions: z.string().min(1).max(60).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;
export type MobileRefreshInput = z.infer<typeof mobileRefreshSchema>;
export type MobileLogoutInput = z.infer<typeof mobileLogoutSchema>;
export type CreateFamilyShareLinkInput = z.infer<typeof createFamilyShareLinkSchema>;
