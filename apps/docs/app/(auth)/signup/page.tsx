"use client";

import React, { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import {
    AuthSplitLayout,
    AuthFormPane,
    AuthVisualPane,
} from "@/components/auth/auth-layout";
import AuthHeader from "@/components/auth/auth-header";
import { AuthSwitchLink, AuthTermsConsent } from "@/components/auth/auth-footer";
import GradientButton from "@/components/auth/gradient-button";
import Input from "@/components/auth/input";
import { hydrateAuth, useAppDispatch, useRegisterMutation } from "@repo/store";
import { AUTH_SESSION_KEY } from "@/constant";
import { registerSchema } from "@repo/schemas/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { sanitizeNext } from "@/lib/auth-utils";

type FieldErrors = {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

const SignupPage = () => {
    const [registerApi, { isLoading }] = useRegisterMutation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    // Separate state for non-field API errors (e.g. "email already taken")
    const [formError, setFormError] = useState("");
    const nextPath = sanitizeNext(searchParams.get("next"));

    const handleGoogleLogin = () => {
        const authBase = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:4000";
        window.location.href = `${authBase}/api/auth/google?next=${encodeURIComponent(nextPath)}`;
    };

    /** Returns true when valid; applies field errors as a side effect when invalid. */
    const applyValidationErrors = (): boolean => {
        const parsed = registerSchema.safeParse({ username, email, password, confirmPassword });
        if (parsed.success) return true;
        const fe = parsed.error.flatten().fieldErrors;
        setFieldErrors({
            username: fe.username?.[0],
            email: fe.email?.[0],
            password: fe.password?.[0],
            confirmPassword: fe.confirmPassword?.[0],
        });
        return false;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setFormError("");

        if (!applyValidationErrors()) return;

        try {
            const res = await registerApi({ username, email, password, confirmPassword }).unwrap();
            if (res?.user) {
                dispatch(hydrateAuth({ user: res.user }));
                localStorage.setItem(AUTH_SESSION_KEY, '1');
            }
            // replace() keeps the signup page out of browser history
            router.replace(nextPath);
        } catch (err) {
            setFormError(getApiErrorMessage(err, 'Signup failed. Please try again.'));
        }
    };

    return (
        <AuthSplitLayout
            reverseDesktop
            formPane={
                <AuthFormPane>
                    <AuthHeader
                        title="Create Account"
                        subtitle="Join students already tracking success"
                    />

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.09] text-white py-3 font-semibold transition-colors"
                        >
                            Continue with Google
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10" />
                            <span className="text-xs text-slate-500">or</span>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <Input
                            id="signup-username"
                            label="Username"
                            type="text"
                            placeholder="student123"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            startIcon={<User className="h-4 w-4" />}
                            required
                            error={fieldErrors.username}
                        />

                        <Input
                            id="signup-email"
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            startIcon={<Mail className="h-4 w-4" />}
                            required
                            error={fieldErrors.email}
                        />

                        <Input
                            id="signup-password"
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            startIcon={<Lock className="h-4 w-4" />}
                            required
                            error={fieldErrors.password}
                        />

                        <Input
                            id="signup-confirmPassword"
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            startIcon={<Lock className="h-4 w-4" />}
                            required
                            error={fieldErrors.confirmPassword}
                        />

                        <AuthTermsConsent id="signup-terms" />

                        {formError && (
                            <div
                                role="alert"
                                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                            >
                                {formError}
                            </div>
                        )}

                        <GradientButton type="submit" isLoading={isLoading} fullWidth>
                            Sign Up
                        </GradientButton>
                    </form>

                    <AuthSwitchLink
                        prompt="Already have an account?"
                        href="/login"
                        label="Log in"
                    />
                </AuthFormPane>
            }
            visualPane={
                <AuthVisualPane>
                    {/* GPU-promoted decorative blob */}
                    <div
                        className="absolute inset-0 bg-gradient-to-bl from-[#a855f7]/20 via-slate-900 to-black opacity-80"
                        aria-hidden="true"
                    />
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1]/30 rounded-full mix-blend-screen blur-[100px] animate-pulse will-change-transform"
                        aria-hidden="true"
                    />

                    <div className="relative z-10 max-w-2xl text-right">
                        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                            Design your ideal<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#6366f1] to-[#a855f7]">
                                daily routine.
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400">
                            Join thousands of students who are taking control of their time and productivity.
                        </p>
                    </div>
                </AuthVisualPane>
            }
        />
    );
};

export default SignupPage;
