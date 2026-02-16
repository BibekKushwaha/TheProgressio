import { StatCard } from '@/components/ui/stat-card';
import { LucideIcon } from 'lucide-react';

interface StatItem {
    label: string;
    value: string | number | React.ReactNode;
    trend?: string;
    icon: LucideIcon;
    gradient: string;
    isLoading?: boolean;
}

interface StatCardsProps {
    items: StatItem[];
}

export function StatCards({ items }: StatCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 min-w-0">
            {items.map((stat, index) => (
                <StatCard
                    key={index}
                    title={stat.value}
                    description={stat.label}
                    icon={stat.icon}
                    iconColor="text-white"
                    iconBgColor={`bg-gradient-to-br ${stat.gradient}`}
                    trend={stat.trend}
                    trendDirection="up" // Defaulting to up as per original design which had green text/badge
                    isLoading={stat.isLoading}
                    variant="default" // Using default variant w/ gradient border as per original AnalyticsCard
                    className="p-6"
                />
            ))}
        </div>
    );
}