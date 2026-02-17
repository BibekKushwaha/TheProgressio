import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    subtitle?: React.ReactNode;
    className?: string;
    children?: React.ReactNode; // For actions
}

export function PageHeader({ title, subtitle, className, children }: PageHeaderProps) {
    return (
        <div className={cn("relative flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2 pt-12 sm:pt-0", className)}>
            <div className="space-y-1 pr-16 sm:pr-0">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                    {title}
                </h1>
                {subtitle && typeof subtitle === 'string' ? (
                    <p className="text-slate-400 text-sm md:text-base font-medium">
                        {subtitle}
                    </p>
                ) : (
                    subtitle
                )}
            </div>
            {children && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 shrink-0 sm:static sm:relative">
                    {children}
                </div>
            )}
        </div>
    );
}
