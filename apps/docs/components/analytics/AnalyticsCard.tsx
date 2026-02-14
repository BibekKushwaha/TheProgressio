'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AnalyticsCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    icon?: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    isLoading?: boolean;
    error?: boolean;
    emptyMessage?: string;
    loadingHeight?: string;
}

export function AnalyticsCard({
    title,
    description,
    icon: Icon,
    iconColor = "text-white",
    iconBgColor = "bg-white/10",
    isLoading = false,
    error = false,
    emptyMessage = "No data available",
    loadingHeight = "h-40",
    className,
    children,
    ...props
}: AnalyticsCardProps) {
    if (isLoading) {
        return (
            <div className={cn("bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6", className)}>
                <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        {description && <Skeleton className="h-3 w-48" />}
                    </div>
                </div>
                <Skeleton className={cn("w-full rounded-lg bg-white/5", loadingHeight)} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center", className)}>
                {Icon && <Icon className="w-10 h-10 text-slate-600 mx-auto mb-3" />}
                <h3 className="font-bold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:bg-white/[0.07]",
                className
            )}
            {...props}
        >
            <div className="flex items-center gap-3 mb-5">
                {Icon && (
                    <div className={cn("p-2 rounded-lg flex items-center justify-center", iconBgColor)}>
                        <Icon className={cn("w-5 h-5", iconColor)} />
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    {description && <p className="text-xs text-slate-400">{description}</p>}
                </div>
            </div>

            {children}
        </div>
    );
}
