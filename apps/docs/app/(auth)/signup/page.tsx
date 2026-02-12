"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import GradientButton from "../../../components/auth/gradient-button";
import Input from "../../../components/auth/input";
import { AuthSwitchLink, AuthTermsConsent } from "../../../components/auth/auth-footer";
import AuthHeader from "../../../components/auth/auth-header";
import { setCredentials, useAppDispatch, useRegisterMutation } from "@repo/store";
import { registerSchema } from "@repo/schemas/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthFormPane, AuthSplitLayout, AuthVisualPane } from "@/components/auth/auth-layout";
import { type FormErrors, zodErrorToFormErrors } from "@/lib/form";

type SignupField = "username" | "email" | "password" | "confirmPassword" | "form";

const SignupPage = () => {
  const [registerApi, { isLoading }] = useRegisterMutation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors<SignupField>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with shared Zod schema (client-side UX validation)
    const parsed = registerSchema.safeParse({ username, email, password, confirmPassword });
    if (!parsed.success) {
      setErrors(zodErrorToFormErrors<SignupField>(parsed.error));
      return;
    }

    try {
      const res = await registerApi({ ...parsed.data, confirmPassword: parsed.data.confirmPassword! }).unwrap();

      if (res && res.user) {
        dispatch(setCredentials({ user: res.user }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth:hasSession', '1');
        }
      }
      router.push('/');
    } catch (err: unknown) {
      setErrors({ form: getApiErrorMessage(err, 'Signup failed. Please try again.') });
    }
  };

  return (
    <AuthSplitLayout
      reverseDesktop
      formPane={(
        <AuthFormPane>
          <AuthHeader
            title="Create Account"
            subtitle="Join successfully tracking students"
          />

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

            <AuthTermsConsent />
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
              Sign Up
            </GradientButton>

            <AuthSwitchLink
              prompt="Already have an account?"
              href="/login"
              label="Log in"
            />
          </form>
        </AuthFormPane>
      )}
      visualPane={(
        <AuthVisualPane>
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
        </AuthVisualPane>
      )}
    />
  );
};

export default SignupPage;
