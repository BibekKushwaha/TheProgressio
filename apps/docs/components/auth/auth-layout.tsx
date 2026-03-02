import React from "react";
import { Card } from "@/components/ui/card";
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

interface AuthCenteredLayoutProps {
    children: React.ReactNode;
    className?: string;
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
            <Card
                className={cn("w-full max-w-md p-8 relative z-10", cardClassName)}
                variant="glass"
            >
                {children}
            </Card>
        </div>
    );
}

/**
 * Full-screen centered layout used by focused single-card auth pages
 * (forgot-password, reset-password). Provides the shared background mesh so
 * individual pages don't duplicate this decoration.
 */
export function AuthCenteredLayout({ children, className }: AuthCenteredLayoutProps) {
    return (
        <div
            className={cn(
                "min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden",
                className,
            )}
        >
            {/* Decorative ambient orbs — GPU-promoted via will-change-transform */}
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#6366f1]/10 rounded-full blur-[100px] will-change-transform" />
                <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-[#a855f7]/10 rounded-full blur-[100px] will-change-transform" />
            </div>
            <div className="w-full max-w-md relative z-10">
                {children}
            </div>
        </div>
    );
}
