"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import GradientButton from "@/components/auth/gradient-button";
import Input from "@/components/auth/input";
import { setCredentials, useAppDispatch, useRegisterMutation } from "@repo/store";
import { registerSchema } from "@repo/schemas/auth";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api-error";

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
    const parsed = registerSchema.safeParse({ username, email, password, confirmPassword });
    if (parsed.success) return true;
    const fieldErrors = parsed.error.flatten().fieldErrors;
    setErrors({
      username: fieldErrors.username?.[0],
      email: fieldErrors.email?.[0],
      password: fieldErrors.password?.[0],
      confirmPassword: fieldErrors.confirmPassword?.[0],
    });
    return false;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const res = await registerApi({ username, email, password, confirmPassword }).unwrap();

      if (res && res.user) {
        dispatch(setCredentials({ user: res.user }));
        localStorage.setItem('auth:hasSession', '1');
      }
      router.push('/');
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Signup failed. Please try again.');
      setErrors({ email: errorMessage });
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Left Side - Form (Reversed from Login) */}
      <div className="lg:col-span-2 bg-slate-950 flex items-center justify-center p-8 relative order-last lg:order-first">
        <Card variant="glass" className="w-full max-w-md p-8 relative z-10">
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
        </Card>
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
