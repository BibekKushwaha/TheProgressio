import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

interface AuthSwitchLinkProps {
    prompt: string;
    href: string;
    label: string;
    className?: string;
}

interface AuthBackLinkProps {
    href: string;
    label?: string;
    icon?: React.ReactNode;
    className?: string;
}

interface AuthTermsConsentProps {
    id?: string;
    required?: boolean;
    className?: string;
    termsHref?: string;
    privacyHref?: string;
}

export function AuthSwitchLink({
    prompt,
    href,
    label,
    className,
}: AuthSwitchLinkProps) {
    return (
        <div className={cn("text-center text-sm text-gray-500 mt-6", className)}>
            {prompt}{" "}
            <Link href={href} className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                {label}
            </Link>
        </div>
    );
}

export function AuthBackLink({
    href,
    label = "Back",
    icon,
    className,
}: AuthBackLinkProps) {
    return (
        <div className={cn("text-center", className)}>
            <Link href={href} className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                {icon}
                {label}
            </Link>
        </div>
    );
}

export function AuthTermsConsent({
    id = "terms",
    required = true,
    className,
    termsHref = "/terms",
    privacyHref = "/privacy",
}: AuthTermsConsentProps) {
    return (
        <div className={cn("flex items-start", className)}>
            <input
                id={id}
                type="checkbox"
                required={required}
                className="mt-1 mr-2 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor={id} className="text-sm text-gray-400 cursor-pointer">
                I agree to the{" "}
                <a href={termsHref} className="text-indigo-400 hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href={privacyHref} className="text-indigo-400 hover:underline">Privacy Policy</a>
            </label>
        </div>
    );
}
