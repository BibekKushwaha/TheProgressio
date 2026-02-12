"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import GradientButton from "../../../components/auth/gradient-button";
import { AuthBackLink } from "../../../components/auth/auth-footer";
import Input from "../../../components/auth/input";
import AuthHeader from "../../../components/auth/auth-header";
import { useForgotPasswordMutation } from "@repo/store";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthFormPane, AuthSplitLayout, AuthVisualPane } from "@/components/auth/auth-layout";

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
<<<<<<< HEAD
            setError(getApiErrorMessage(err, "Something went wrong. Please try again."));
=======
            const message =
                typeof err === "object" && err !== null && "data" in err
                    ? (err as { data?: { message?: string } }).data?.message
                    : undefined;
            setError(message || "Something went wrong. Please try again.");
>>>>>>> origin/main
        }
    };

    return (
<<<<<<< HEAD
        <AuthSplitLayout
            visualPane={(
                <AuthVisualPane>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-slate-900 to-black opacity-80" />
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#6366f1]/10 rounded-full blur-[100px]" />
                    <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-[#a855f7]/10 rounded-full blur-[100px]" />
                    <div className="relative z-10 max-w-2xl text-left">
                        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                            Recover access and<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
                                get back on track.
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400">
                            Reset your password and continue building your streak with zero friction.
                        </p>
                    </div>
                </AuthVisualPane>
            )}
            formPane={(
                <AuthFormPane>
                    {!isSubmitted ? (
                        <>
                            <AuthHeader
                                title="Forgot Password?"
                                subtitle="Enter your email address and we'll send you a link to reset your password."
                                titleClassName="text-2xl"
                                subtitleClassName="text-sm"
                                icon={(
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-indigo-400 mb-4 ring-1 ring-white/10">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                )}
=======
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Mesh */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#6366f1]/10 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-[#a855f7]/10 rounded-full blur-[100px]" />
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
>>>>>>> origin/main
                            />

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

                                <AuthBackLink
                                    href="/login"
                                    label="Back to Login"
                                    icon={<ArrowLeft className="mr-2 h-3 w-3" />}
                                />
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <AuthHeader
                                title="Check your inbox"
                                subtitle={(
                                    <>
                                        We&apos;ve sent a password reset link to{" "}
                                        <span className="text-white font-medium">{email}</span>.
                                        {" "}Please check your email.
                                    </>
                                )}
                                titleClassName="text-2xl"
                                subtitleClassName="mb-8"
                                className="mb-0"
                                icon={(
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-400 mb-6 ring-1 ring-green-500/20">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                )}
                            />
                            <Link href="/login">
                                <GradientButton variant="outline" fullWidth>
                                    Back to Login
                                </GradientButton>
                            </Link>
                        </div>
<<<<<<< HEAD
                    )}
                </AuthFormPane>
            )}
        />
=======
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
            </GlassCard>
        </div>
>>>>>>> origin/main
    );
};

export default ForgotPasswordPage;
