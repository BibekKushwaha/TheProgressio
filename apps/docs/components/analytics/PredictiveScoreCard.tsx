'use client';

import { useGetPredictivePerformanceQuery } from '@repo/store';
import { TrendingUp, TrendingDown, Minus, Trophy, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PredictiveScoreCard() {
    const { data, isLoading } = useGetPredictivePerformanceQuery('midterm');

    const subjects = data?.data || [];

    if (isLoading) {
        return (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <Skeleton className="h-6 w-48 bg-white/10 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (subjects.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
                <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-1">No Predictions Yet</h3>
                <p className="text-sm text-slate-500">Add grade entries to see predictive scores based on your learning pace.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                    <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Predictive Score Indicator</h3>
                    <p className="text-xs text-slate-400">Based on your learning pace and historical performance</p>
                </div>
            </div>

            <div className="space-y-3">
                {subjects.map((subject: any) => {
                    const predicted = subject.predictedScore ?? subject.avgScore ?? 0;
                    const trend = subject.trend || 'stable';
                    const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
                    const trendColor = trend === 'improving' ? 'text-green-400' : trend === 'declining' ? 'text-red-400' : 'text-yellow-400';
                    const barColor = predicted >= 80 ? 'from-green-500 to-emerald-400' :
                        predicted >= 60 ? 'from-yellow-500 to-orange-400' :
                            'from-red-500 to-rose-400';

                    return (
                        <div key={subject.subjectName || subject.subject} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-white">{subject.subjectName || subject.subject}</span>
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
                                <span>{subject.entryCount || 0} entries</span>
                                <span className={trendColor}>{trend}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
