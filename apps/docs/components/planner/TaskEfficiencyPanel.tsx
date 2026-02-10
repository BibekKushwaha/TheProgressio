'use client';

import { useParams } from 'next/navigation';
import { useGetTaskEfficiencyQuery } from '@repo/store';
import { Clock, TrendingUp, Zap, BarChart3 } from 'lucide-react';

export function TaskEfficiencyPanel() {
    const params = useParams();
    const taskId = params?.id as string;
    const { data, isLoading } = useGetTaskEfficiencyQuery(taskId, { skip: !taskId });
    const stats = data?.stats;

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-5 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-32 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-4 bg-white/5 rounded" />)}
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const items = [
        { icon: Clock, label: 'Total Time', value: `${stats.totalMinutes ?? 0}m`, color: 'text-blue-400' },
        { icon: BarChart3, label: 'Sessions', value: `${stats.sessionCount ?? 0}`, color: 'text-purple-400' },
        { icon: TrendingUp, label: 'Avg Session', value: `${stats.avgSessionMinutes ?? 0}m`, color: 'text-green-400' },
        { icon: Zap, label: 'Efficiency', value: `${stats.efficiency ?? '-'}%`, color: 'text-amber-400' },
    ];

    return (
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Task Efficiency
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {items.map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                            <span className="text-xs text-slate-500">{label}</span>
                        </div>
                        <p className="text-lg font-bold text-white">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
