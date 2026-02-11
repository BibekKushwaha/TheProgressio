"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import GlassCard from "../../../components/ui/glass-card";
import GradientButton from "../../../components/auth/gradient-button";
import Input from "../../../components/auth/input";
import { setCredentials, useAppDispatch, useRegisterMutation } from "@repo/store";
import { registerSchema } from "@repo/schemas/auth";

const SignupPage = () => {
  const [registerApi, { isLoading }] = useRegisterMutation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; confirmPassword?: string }>({});


  const validateForm = () => {
    const newErrors: { username?: string; email?: string; password?: string; confirmPassword?: string } = {};

    if (!username) {
      newErrors.username = 'Full Name is required';
    } else if (username.length < 2) {
      newErrors.username = 'Full Name must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Validate with shared Zod schema (client-side UX validation)
    const parsed = registerSchema.safeParse({ username, email, password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        username: fieldErrors.username?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }
    console.log(parsed.data);

    try {
      const res = await registerApi({ ...parsed.data, confirmPassword: parsed.data.confirmPassword! }).unwrap();
      console.log("user is register successfully", res);

      if (res && res.user) {
        dispatch(setCredentials({ user: res.user }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth:hasSession', '1');
        }
      }
      router.push('/');
    } catch (err: unknown) {
      console.error('Signup failed:', err);
      // Extract likely server error message if available
      const serverMessage =
        typeof err === 'object' && err !== null
          ? (err as { data?: { message?: string } | string; error?: string; status?: number }).data && typeof (err as { data?: unknown }).data !== 'string'
            ? (err as { data?: { message?: string } }).data?.message
            : (err as { data?: string }).data || (err as { error?: string }).error
          : null;
      const statusMessage =
        typeof err === 'object' && err !== null && 'status' in err
          ? `Request failed: ${(err as { status?: number }).status}`
          : null;
      const fallbackMessage = statusMessage || 'Signup failed. Please try again.';
      setErrors({ email: typeof serverMessage === 'string' ? serverMessage : fallbackMessage });
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Left Side - Form (Reversed from Login) */}
      <div className="lg:col-span-2 bg-slate-950 flex items-center justify-center p-8 relative order-last lg:order-first">
        <GlassCard className="w-full max-w-md p-8 relative z-10" gradient>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400">Join successfully tracking students</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="username"
              label="Username"
              type="text"
              placeholder="student123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              startIcon={<User className="h-4 w-4" />}
              required
              error={errors.username}
            />

            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startIcon={<Mail className="h-4 w-4" />}
              required
              error={errors.email}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startIcon={<Lock className="h-4 w-4" />}
              required
              error={errors.password}
            />

            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              startIcon={<Lock className="h-4 w-4" />}
              required
              error={errors.confirmPassword}
            />

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 mr-2 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer">
                I agree to the <a href="#" className="text-indigo-400 hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-400 hover:underline">Privacy Policy</a>
              </label>
            </div>
            <GradientButton
              type="submit"
              isLoading={isLoading}
              fullWidth
            >
              Sign Up
            </GradientButton>

            <div className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </GlassCard>
      </div>

      {/* Right Side - Art */}
      <div className="hidden lg:flex lg:col-span-3 bg-slate-900 relative overflow-hidden items-center justify-center p-12 order-first lg:order-last">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#a855f7]/20 via-slate-900 to-black opacity-80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1]/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" />

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
      </div>
    </div>
  );
};

export default SignupPage;
