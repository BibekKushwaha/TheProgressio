"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import {
    AuthSplitLayout,
    AuthFormPane,
    AuthVisualPane,
} from "@/components/auth/auth-layout";
import AuthHeader from "@/components/auth/auth-header";
import { AuthSwitchLink } from "@/components/auth/auth-footer";
import GradientButton from "@/components/auth/gradient-button";
import Input from "@/components/auth/input";
import { hydrateAuth, useAppDispatch, useLoginMutation, useAppSelector, selectIsAuthenticated } from "@repo/store";
import { AUTH_SESSION_KEY } from "@/constant";
import { loginSchema } from "@repo/schemas/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { sanitizeNext } from "@/lib/auth-utils";

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    // Use RTK Query's isLoading directly — no duplicate manual state
    const [loginApi, { isLoading }] = useLoginMutation();
    const nextPath = sanitizeNext(searchParams.get("next"));

    // If the user is already authenticated (e.g. navigated here while session
    // is still valid), send them straight to their intended destination instead
    // of showing the login form.
    useEffect(() => {
        if (isAuthenticated) {
            router.replace(nextPath);
        }
    }, [isAuthenticated, nextPath, router]);

    const handleGoogleLogin = () => {
        const authBase = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:4000";
        window.location.href = `${authBase}/api/auth/google?next=${encodeURIComponent(nextPath)}`;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const validate = loginSchema.safeParse({ email, password });
        if (!validate.success) {
            setError(validate.error.issues[0]?.message ?? "Invalid input");
            return;
        }
        setError("");

        try {
            const response = await loginApi(validate.data).unwrap();
            if (response) {
                dispatch(hydrateAuth(response));
                localStorage.setItem(AUTH_SESSION_KEY, '1');
                // replace() prevents the login page from appearing in browser history
                router.replace(nextPath);
            }
        } catch (err) {
            setError(getApiErrorMessage(err, 'Login failed. Please try again.'));
        }
    };

    return (
        <AuthSplitLayout
            formPane={
                <AuthFormPane>
                    <AuthHeader
                        title="Welcome Back"
                        subtitle="Sign in to continue your streak"
                    />

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.09] text-white py-3 font-semibold transition-colors"
                    >
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-3 my-4">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-slate-500">or</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <Input
                            id="login-email"
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            startIcon={<Mail className="h-4 w-4" />}
                            required
                        />

                        <div className="space-y-2">
                            <Input
                                id="login-password"
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                startIcon={<Lock className="h-4 w-4" />}
                                required
                            />
                            <div className="flex justify-end text-sm">
                                <Link
                                    href="/forgot-password"
                                    className="text-indigo-400 hover:text-indigo-300 hover:underline"
                                >
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                            >
                                {error}
                            </div>
                        )}

                        <GradientButton type="submit" isLoading={isLoading} fullWidth>
                            Log In
                        </GradientButton>
                    </form>

                    <AuthSwitchLink
                        prompt="Don't have an account?"
                        href="/signup"
                        label="Sign up"
                    />
                </AuthFormPane>
            }
            visualPane={
                <AuthVisualPane>
                    {/* GPU-promoted decorative blobs — will-change-transform prevents
                        full-page repaints on scroll */}
                    <div
                        className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-slate-900 to-black opacity-80"
                        aria-hidden="true"
                    />
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-multiply blur-3xl opacity-20 animate-blob will-change-transform" aria-hidden="true" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#a855f7] rounded-full mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-2000 will-change-transform" aria-hidden="true" />

                    <div className="relative z-10 max-w-2xl text-left">
                        <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
                            Master your habits,<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
                                master your future.
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400">
                            Track your tasks, build consistent habits, and visualize your productivity journey.
                        </p>
                    </div>
                </AuthVisualPane>
            }
        />
    );
};

export default LoginPage;
