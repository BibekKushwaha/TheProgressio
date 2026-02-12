import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeroStatItem {
    id?: string;
    label: ReactNode;
    value: ReactNode;
    icon?: ReactNode;
    valueClassName?: string;
    cardClassName?: string;
}

interface HeroStatsGridProps {
    items: HeroStatItem[];
    className?: string;
}

export function HeroStatsGrid({ items, className }: HeroStatsGridProps) {
    if (items.length === 0) return null;

    return (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
            {items.map((item, index) => (
                <div
                    key={item.id || `hero-stat-${index}`}
                    className={cn(
                        'rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3',
                        item.cardClassName
                    )}
                >
                    <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
                        {item.icon}
                        {item.label}
                    </div>
                    <div className={cn('mt-1 text-sm font-semibold text-white', item.valueClassName)}>
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
