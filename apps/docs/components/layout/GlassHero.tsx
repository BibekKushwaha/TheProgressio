import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassHeroProps {
    children: ReactNode;
    className?: string;
    topGlowClassName?: string;
    bottomGlowClassName?: string;
}

export function GlassHero({
    children,
    className,
    topGlowClassName,
    bottomGlowClassName,
}: GlassHeroProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-indigo-500/[0.08] to-white/[0.02] p-6 md:p-8',
                className
            )}
        >
            <div
                className={cn(
                    'absolute -top-20 -right-20 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none',
                    topGlowClassName
                )}
            />
            <div
                className={cn(
                    'absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none',
                    bottomGlowClassName
                )}
            />
            <div className="relative">{children}</div>
        </div>
    );
}
