"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AuthCenteredLayout } from "@/components/auth/auth-layout";
import AuthHeader from "@/components/auth/auth-header";
import GradientButton from "@/components/auth/gradient-button";
import Input from "@/components/auth/input";
import { useResetPasswordMutation, useLogoutMutation } from "@repo/store";
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@repo/schemas/auth';
import { z } from 'zod';

// Schema allocated once at module level — not on every submit call
const resetConfirmSchema = resetPasswordSchema
    .extend({ confirmPassword: z.string() })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const MIN_TOKEN_LENGTH = 10;

const ResetPasswordPage = () => {
    const params = useParams();
    const router = useRouter();
    const token = typeof params.token === 'string' ? params.token : '';

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetPassword, { isLoading }] = useResetPasswordMutation();
    const [logout] = useLogoutMutation();

    // Cleanup: cancel the auto-redirect timer if the user navigates away early
    useEffect(() => {
        if (!isSubmitted) return;
        const id = setTimeout(() => router.push('/login'), 3000);
        return () => clearTimeout(id);
    }, [isSubmitted, router]);

    // Guard: render an error UI instead of firing an API call with an invalid token
    if (!token || token.length < MIN_TOKEN_LENGTH) {
        return (
            <AuthCenteredLayout>
                <Card variant="glass" className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-4 ring-1 ring-red-500/20">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
                    <p className="text-gray-400 mb-6 text-sm">
                        This password reset link is invalid or has already been used.
                        Please request a new one.
                    </p>
                    <Link href="/forgot-password">
                        <GradientButton fullWidth>Request New Link</GradientButton>
                    </Link>
                </Card>
            </AuthCenteredLayout>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validation = resetConfirmSchema.safeParse({ password, confirmPassword });
        if (!validation.success) {
            setError(validation.error.issues[0]?.message ?? 'Invalid input');
            return;
        }

        try {
            await resetPassword({ token, password }).unwrap();
            toast.success("Password reset successfully!");
            // Logout the current session so the user can log back in with the new password
            try {
                await logout().unwrap();
            } catch {
                // Logout failed, but continue anyway
            }
            setIsSubmitted(true);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, "Failed to reset password. The link may be expired."));
        }
    };

    return (
        <AuthCenteredLayout>
            <Card variant="glass" className="p-8">
                {!isSubmitted ? (
                    <>
                        <AuthHeader
                            title="Reset Password"
                            subtitle="Please enter your new password below."
                            titleClassName="text-2xl"
                            icon={
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-indigo-400 mb-4 ring-1 ring-white/10">
                                    <Lock className="w-6 h-6" />
                                </div>
                            }
                        />

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                id="reset-password"
                                label="New Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                startIcon={<Lock className="h-4 w-4" />}
                                endIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((p) => !p)}
                                        className="text-gray-400 hover:text-white transition-colors focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword
                                            ? <EyeOff className="h-4 w-4" />
                                            : <Eye className="h-4 w-4" />
                                        }
                                    </button>
                                }
                                required
                            />

                            <Input
                                id="reset-confirmPassword"
                                label="Confirm New Password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                startIcon={<Lock className="h-4 w-4" />}
                                required
                            />

                            {error && (
                                <p role="alert" className="text-sm text-red-400 text-center">
                                    {error}
                                </p>
                            )}

                            <GradientButton type="submit" isLoading={isLoading} fullWidth>
                                Reset Password
                            </GradientButton>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="mr-2 h-3 w-3" />
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-400 mb-6 ring-1 ring-green-500/20">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Password Updated</h2>
                        <p className="text-gray-400 mb-8">
                            Your password has been successfully reset. Redirecting you to login…
                        </p>
                        <Link href="/login">
                            <GradientButton fullWidth>Go to Login Now</GradientButton>
                        </Link>
                    </div>
                )}
            </Card>
        </AuthCenteredLayout>
    );
};

export default ResetPasswordPage;
