import React from "react";
import GlassCard from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface AuthSplitLayoutProps {
    formPane: React.ReactNode;
    visualPane: React.ReactNode;
    reverseDesktop?: boolean;
}

interface AuthVisualPaneProps {
    children: React.ReactNode;
    className?: string;
}

interface AuthFormPaneProps {
    children: React.ReactNode;
    className?: string;
    cardClassName?: string;
    mobileBackgroundClassName?: string;
}

export function AuthSplitLayout({
    formPane,
    visualPane,
    reverseDesktop = false,
}: AuthSplitLayoutProps) {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
            <section
                className={cn(
                    "lg:col-span-3",
                    reverseDesktop && "order-first lg:order-last",
                )}
            >
                {visualPane}
            </section>
            <section
                className={cn(
                    "lg:col-span-2",
                    reverseDesktop && "order-last lg:order-first",
                )}
            >
                {formPane}
            </section>
        </div>
    );
}

export function AuthVisualPane({ children, className }: AuthVisualPaneProps) {
    return (
        <div
            className={cn(
                "hidden lg:flex h-full bg-slate-900 relative overflow-hidden items-center justify-center p-12",
                className,
            )}
        >
            {children}
        </div>
    );
}

export function AuthFormPane({
    children,
    className,
    cardClassName,
    mobileBackgroundClassName,
}: AuthFormPaneProps) {
    return (
        <div
            className={cn(
                "h-full bg-slate-950 flex items-center justify-center p-8 relative",
                className,
            )}
        >
            <div
                className={cn(
                    "lg:hidden absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-slate-950",
                    mobileBackgroundClassName,
                )}
            />
            <GlassCard
                className={cn("w-full max-w-md p-8 relative z-10", cardClassName)}
                gradient
            >
                {children}
            </GlassCard>
        </div>
    );
}
