"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import GradientButton from "@/components/auth/gradient-button";
import Input from "@/components/auth/input";
import { useResetPasswordMutation } from "@repo/store";
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@repo/schemas/auth';
import { z } from 'zod';

const ResetPasswordPage = () => {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const confirmSchema = resetPasswordSchema.extend({
            confirmPassword: z.string(),
        }).refine((d) => d.password === d.confirmPassword, {
            message: 'Passwords do not match',
            path: ['confirmPassword'],
        });

        const validation = confirmSchema.safeParse({ password, confirmPassword });
        if (!validation.success) {
            setError(validation.error.issues[0]?.message ?? 'Invalid input');
            return;
        }

        try {
            await resetPassword({ token, password }).unwrap();
            setIsSubmitted(true);
            toast.success("Password reset successfully!");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, "Failed to reset password. The link may be expired."));
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Mesh */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#6366f1]/10 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-[#a855f7]/10 rounded-full blur-[100px]" />
            </div>

            <Card variant="glass" className="w-full max-w-md p-8 relative z-10">
                {!isSubmitted ? (
                    <>
                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-indigo-400 mb-4 ring-1 ring-white/10">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                            <p className="text-gray-400 text-sm">
                                Please enter your new password below.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <Input
                                    label="New Password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    startIcon={<Lock className="h-4 w-4" />}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-[38px] text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            <Input
                                label="Confirm New Password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                startIcon={<Lock className="h-4 w-4" />}
                                required
                            />

                            {error && (
                                <p className="text-sm text-red-400 text-center">{error}</p>
                            )}

                            <GradientButton
                                type="submit"
                                isLoading={isLoading}
                                fullWidth
                            >
                                Reset Password
                            </GradientButton>

                            <div className="text-center">
                                <Link href="/login" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
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
                            Your password has been successfully reset. Redirecting you to login...
                        </p>
                        <Link href="/login">
                            <GradientButton fullWidth>
                                Go to Login Now
                            </GradientButton>
                        </Link>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ResetPasswordPage;
