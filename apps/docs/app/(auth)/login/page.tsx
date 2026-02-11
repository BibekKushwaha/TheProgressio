"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import GlassCard from "../../../components/ui/glass-card";
import GradientButton from "../../../components/auth/gradient-button";
import Input from "../../../components/auth/input";
import { hydrateAuth, useAppDispatch, useLoginMutation } from "@repo/store";
import { loginSchema } from "@repo/schemas/auth";

const LoginPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const dispatch = useAppDispatch();
    const [loginApi] = useLoginMutation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const validate = loginSchema.safeParse({ email, password });
        if (!validate.success) {
            setError(validate.error.message || "Invalid input");
            return;
        }
        setIsLoading(true);
        setError("");
        console.log(validate.data);

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
        } catch (err: any) {
            setError(err.data?.message || err.message || "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
            {/* Left Side - Abstract Art */}
            <div className="hidden lg:flex lg:col-span-3 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
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
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:col-span-2 bg-slate-950 flex items-center justify-center p-8 relative">
                {/* Mobile Background Elements */}
                <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-slate-950" />

                <GlassCard className="w-full max-w-md p-8 relative z-10" gradient>
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                        <p className="text-gray-400">Sign in to continue your streak</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input
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
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                startIcon={<Lock className="h-4 w-4" />}
                                required
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

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <GradientButton
                            type="submit"
                            isLoading={isLoading}
                            fullWidth
                        >
                            Log In
                        </GradientButton>

                        <div className="text-center text-sm text-gray-500 mt-6">
                            Don't have an account?{" "}
                            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                                Sign up
                            </Link>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default LoginPage;
