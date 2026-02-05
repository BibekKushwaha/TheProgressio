"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import GlassCard from "../../components/ui/glass-card";
import GradientButton from "../../components/ui/gradient-button";
import Input from "../../components/ui/input";

// Note: Forgot Password API not fully implemented in backend/auth.controller.ts yet (commented out),
// but implementing frontend for completeness.
const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsSubmitted(true);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Mesh */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[100px]" />
            </div>

            <GlassCard className="w-full max-w-md p-8 relative z-10" gradient>
                {!isSubmitted ? (
                    <>
                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-indigo-400 mb-4 ring-1 ring-white/10">
                                <Mail className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
                            <p className="text-gray-400 text-sm">
                                Enter your email address and we'll send you a link to reset your password.
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
                            We've sent a password reset link to <span className="text-white font-medium">{email}</span>. Please check your email.
                        </p>
                        <Link href="/login">
                            <GradientButton variant="outline" fullWidth>
                                Back to Login
                            </GradientButton>
                        </Link>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default ForgotPasswordPage;
