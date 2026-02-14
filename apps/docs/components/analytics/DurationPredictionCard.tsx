'use client';

import { useGetPredictionQuery } from '@repo/store';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';

export function DurationPredictionCard({ taskId }: { taskId?: string }) {
    const { data, isLoading, error } = useGetPredictionQuery(taskId ? { taskId } : undefined, {
        skip: !taskId,
    });

    if (!taskId) {
        return (
            <AnalyticsCard
                title="ML Duration Prediction"
                description="Select a task to see predicted completion time."
                icon={Clock}
                iconColor="text-blue-400"
                iconBgColor="bg-blue-500/10"
            >
                <div className="h-20 flex items-center justify-center text-sm text-slate-500 italic">
                    Waiting for selection...
                </div>
            </AnalyticsCard>
        );
    }

    if (error || !data?.prediction) {
        return (
            <AnalyticsCard
                title="Duration Prediction"
                description="Not enough data to predict duration yet."
                icon={AlertCircle}
                iconColor="text-slate-400"
                iconBgColor="bg-slate-500/10"
                error={true}
                emptyMessage="Not enough data to predict duration yet."
            />
        );
    }

    const pred = data.prediction;

    return (
        <AnalyticsCard
            title="Smart Duration Prediction"
            icon={TrendingUp}
            iconColor="text-white"
            iconBgColor="bg-gradient-to-br from-blue-500 to-cyan-500"
            isLoading={isLoading}
        >
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                    <div className="text-xs text-green-400 mb-1">Optimistic</div>
                    <div className="text-xl font-bold text-green-400">{pred.optimistic}m</div>
                </div>
                <div className="bg-white/5 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-blue-400 mb-1">Expected</div>
                    <div className="text-xl font-bold text-blue-400">{pred.expected}m</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                    <div className="text-xs text-orange-400 mb-1">Pessimistic</div>
                    <div className="text-xl font-bold text-orange-400">{pred.pessimistic}m</div>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Confidence: <span className="text-white font-semibold">{pred.confidence}</span></span>
                <span>Sample: {pred.sampleSize} tasks</span>
            </div>
        </AnalyticsCard>
    );
}
