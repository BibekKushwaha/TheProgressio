'use client';

import { useGetPredictionQuery } from '@repo/store';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function DurationPredictionCard({ taskId }: { taskId?: string }) {
    const { data, isLoading, error } = useGetPredictionQuery(taskId ? { taskId } : undefined, {
        skip: !taskId,
    });

    if (!taskId) {
        return (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">ML Duration Prediction</h3>
                </div>
                <p className="text-sm text-slate-400">Select a task to see predicted completion time.</p>
            </div>
        );
    }

    if (isLoading) return <Skeleton className="h-40 w-full bg-white/5 rounded-xl" />;

    if (error || !data?.prediction) {
        return (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-slate-500" />
                    <h3 className="text-lg font-bold text-white">Duration Prediction</h3>
                </div>
                <p className="text-sm text-slate-400">Not enough data to predict duration yet.</p>
            </div>
        );
    }

    const pred = data.prediction;

    return (
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">ML Duration Prediction</h3>
            </div>

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
        </div>
    );
}
