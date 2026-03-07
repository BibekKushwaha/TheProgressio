'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronRight } from 'lucide-react';

interface AnalyticsEmptyStateProps {
    title: string;
    description: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
}

export function AnalyticsEmptyState({
    title,
    description,
    primaryHref,
    primaryLabel,
    secondaryHref,
    secondaryLabel,
}: AnalyticsEmptyStateProps) {
    return (
        <div className="rounded-2xl border border-dashed border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03] p-8 md:p-10">
            <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                    <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                    {description}
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button asChild className="btn-primary w-full sm:w-auto">
                        <Link href={primaryHref}>
                            {primaryLabel}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                    {secondaryHref && secondaryLabel ? (
                        <Button asChild variant="ghost" className="w-full text-slate-300 hover:text-white sm:w-auto">
                            <Link href={secondaryHref}>{secondaryLabel}</Link>
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}