"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import GradientButton from "../../../components/auth/gradient-button";
import Input from "../../../components/auth/input";
import { AuthSwitchLink } from "../../../components/auth/auth-footer";
import AuthHeader from "../../../components/auth/auth-header";
import { hydrateAuth, useAppDispatch, useLoginMutation } from "@repo/store";
import { loginSchema } from "@repo/schemas/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthFormPane, AuthSplitLayout, AuthVisualPane } from "@/components/auth/auth-layout";
import { type FormErrors, firstZodIssueMessage, zodErrorToFormErrors } from "@/lib/form";

type LoginField = "email" | "password" | "form";

const LoginPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors<LoginField>>({});

    const dispatch = useAppDispatch();
    const [loginApi, { isLoading }] = useLoginMutation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const validate = loginSchema.safeParse({ email, password });
        if (!validate.success) {
            const fieldErrors = zodErrorToFormErrors<LoginField>(validate.error);
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(fieldErrors);
                return;
            }

            setErrors({ form: firstZodIssueMessage(validate.error, "Invalid input") });
            return;
        }

        try {
            const response = await loginApi(validate.data).unwrap();

            if (response) {
                dispatch(hydrateAuth({ user: response.user }));
                if (typeof window !== 'undefined') {
                    localStorage.setItem('auth:hasSession', '1');
                }
                // Assuming cookie is set by backend, just redirect
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            setErrors({ form: getApiErrorMessage(err, "Login failed. Please try again.") });
        }
    };

    return (
        <AuthSplitLayout
            visualPane={(
                <AuthVisualPane>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-slate-900 to-black opacity-80" />
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#a855f7] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

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
            )}
            formPane={(
                <AuthFormPane>
                    <AuthHeader
                        title="Welcome Back"
                        subtitle="Sign in to continue your streak"
                    />

                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            startIcon={<Mail className="h-4 w-4" />}
                            required
                            error={errors.email}
                        />

                        <div className="space-y-2">
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                startIcon={<Lock className="h-4 w-4" />}
                                required
                                error={errors.password}
                            />
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center text-gray-400 cursor-pointer hover:text-gray-300">
                                    <input type="checkbox" className="mr-2 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500" />
                                    Remember me
                                </label>
                                <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        {errors.form && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                {errors.form}
                            </div>
                        )}

                        <GradientButton
                            type="submit"
                            isLoading={isLoading}
                            fullWidth
                        >
                            Log In
                        </GradientButton>

                        <AuthSwitchLink
                            prompt="Don't have an account?"
                            href="/signup"
                            label="Sign up"
                        />
                    </form>
                </AuthFormPane>
            )}
        />
    );
};

export default LoginPage;
