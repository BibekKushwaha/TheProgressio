"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import GradientButton from "@/components/auth/gradient-button";
import Input from "@/components/auth/input";
import { useForgotPasswordMutation } from "@repo/store";
import { getApiErrorMessage } from '@/lib/api-error';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await forgotPassword({ email }).unwrap();
            setIsSubmitted(true);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, "Something went wrong. Please try again."));
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
                                <Mail className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
                            <p className="text-gray-400 text-sm">
                                Enter your email address and we&apos;ll send you a link to reset your password.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                startIcon={<Mail className="h-4 w-4" />}
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
                                Send Reset Link
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
                        <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
                        <p className="text-gray-400 mb-8">
                            We&apos;ve sent a password reset link to <span className="text-white font-medium">{email}</span>. Please check your email.
                        </p>
                        <Link href="/login">
                            <GradientButton variant="outline" fullWidth>
                                Back to Login
                            </GradientButton>
                        </Link>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ForgotPasswordPage;
