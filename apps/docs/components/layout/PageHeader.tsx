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
        <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6", className)}>
            <div className="space-y-1">
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
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
                <div className="flex items-center gap-3 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}
