'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';

const statCardVariants = cva(
    "rounded-xl p-6 transition-all duration-300 hover:shadow-lg",
    {
        variants: {
            variant: {
                default: "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 hover:bg-white/[0.07]",
                glass: "bg-white/5 backdrop-blur-md border border-white/10",
                flat: "bg-card text-card-foreground shadow-sm",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface StatCardProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof statCardVariants> {
    title: React.ReactNode;
    description?: string;
    subDescription?: string;
    icon?: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    isLoading?: boolean;
    error?: boolean;
    emptyMessage?: string;
    loadingHeight?: string;
}

export function StatCard({
    title,
    description,
    subDescription,
    icon: Icon,
    iconColor = "text-white",
    iconBgColor = "bg-white/10",
    trend,
    trendDirection = 'neutral',
    isLoading = false,
    error = false,
    emptyMessage = "No data available",
    loadingHeight = "h-40",
    variant,
    className,
    children,
    ...props
}: StatCardProps) {
    if (isLoading) {
        return (
            <div className={cn(statCardVariants({ variant: 'glass' }), "relative overflow-hidden", className)}>
                <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        {description && <Skeleton className="h-3 w-24" />}
                    </div>
                </div>
                <Skeleton className={cn("w-full rounded-lg bg-white/5", loadingHeight)} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn(statCardVariants({ variant: 'glass' }), "text-center", className)}>
                {Icon && <Icon className="w-10 h-10 text-slate-600 mx-auto mb-3" />}
                <h3 className="font-bold text-white mb-1">{title as React.ReactNode}</h3>
                <p className="text-sm text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div
            className={cn(statCardVariants({ variant }), className)}
            {...props}
        >
            <div className="relative">
                {trend && (
                    <div className="absolute top-0 right-0">
                        <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold border",
                            trendDirection === 'up' && "bg-green-500/20 border-green-500/30 text-green-400",
                            trendDirection === 'down' && "bg-red-500/20 border-red-500/30 text-red-400",
                            trendDirection === 'neutral' && "bg-slate-500/20 border-slate-500/30 text-slate-400"
                        )}>
                            {trend}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                    {Icon && (
                        <div className={cn("p-2 rounded-lg flex items-center justify-center shrink-0", iconBgColor)}>
                            <Icon className={cn("w-5 h-5", iconColor)} />
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h3 className="text-2xl font-bold text-white mb-1">{title}</h3>
                    {description && <p className="text-sm text-slate-400">{description}</p>}
                    {subDescription && <p className="text-xs text-slate-500 mt-1">{subDescription}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}
