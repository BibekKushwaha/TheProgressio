'use client';

import { useGetPredictivePerformanceQuery } from '@repo/store';
import { TrendingUp, TrendingDown, Minus, Trophy, Target } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

export function PredictiveScoreCard() {
    const { data, isLoading } = useGetPredictivePerformanceQuery('JEE');
    const subjects = data?.data || [];

    if (isLoading) {
        return (
            <StatCard
                title="Predictive Score Indicator"
                description="Based on your learning pace and historical performance"
                icon={Trophy}
                iconColor="text-white"
                iconBgColor="bg-gradient-to-br from-emerald-500 to-teal-500"
                isLoading={true}
                loadingHeight="h-64"
                variant="default"
            />
        );
    }

    if (subjects.length === 0) {
        return (
            <StatCard
                title="No Predictions Yet"
                icon={Target}
                iconColor="text-slate-600"
                iconBgColor="bg-transparent"
                error={true}
                emptyMessage="Add grade entries to see predictive scores based on your learning pace."
                variant="default"
            />
        );
    }

    return (
        <StatCard
            title="Predictive Score Indicator"
            description="Based on your learning pace and historical performance"
            icon={Trophy}
            iconColor="text-white"
            iconBgColor="bg-gradient-to-br from-emerald-500 to-teal-500"
            variant="default"
        >
            <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                Model {data?.modelVersion ?? 'unknown'} • subject confidence labels are shown per row
            </div>

            <div className="space-y-3">
                {subjects.map((subject) => {
                    const predicted = subject.estimatedExamScore ?? 0;
                    const trend = subject.pace ?? 'steady';
                    const TrendIcon = trend === 'accelerating' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
                    const trendColor = trend === 'accelerating' ? 'text-green-400' : trend === 'declining' ? 'text-red-400' : 'text-yellow-400';
                    const barColor = predicted >= 80 ? 'from-green-500 to-emerald-400' :
                        predicted >= 60 ? 'from-yellow-500 to-orange-400' :
                            'from-red-500 to-rose-400';

                    return (
                        <div key={subject.subjectName} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-white">{subject.subjectName}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-white">{predicted.toFixed(0)}%</span>
                                    <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                                </div>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                                    style={{ width: `${Math.min(predicted, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                                <span>{subject.simulationRuns || 0} sims</span>
                                <span className={trendColor}>
                                    {trend} • {subject.confidence} confidence
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </StatCard>
    );
}
