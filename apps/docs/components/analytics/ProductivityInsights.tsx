'use client';

import {
    useGetTimeLeakageQuery,
    useGetPeakWindowQuery,
    useGetPredictivePerformanceQuery,
    PeakProductivityResult,
    LearningPace,
} from '@repo/store';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, TrendingUp, AlertCircle, Sun } from 'lucide-react';

interface ProductivityInsightsProps {
    examType?: string;
    days?: number;
}

export function ProductivityInsights({ examType = 'JEE', days = 7 }: ProductivityInsightsProps) {
    const { data: leakageData, isLoading: leakageLoading } = useGetTimeLeakageQuery(days);
    const { data: peakData, isLoading: peakLoading } = useGetPeakWindowQuery();
    const { data: performanceData, isLoading: performanceLoading } = useGetPredictivePerformanceQuery(examType);

    const isLoading = leakageLoading || peakLoading || performanceLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full bg-white/5" />
                <Skeleton className="h-48 w-full bg-white/5" />
            </div>
        );
    }

    type EfficiencyHour = { hour: number; avgMinutes: number };
    type PeakWindow = { startHour: number; endHour: number; label?: string };
    type PeakData = {
        peakWindow: PeakWindow;
        efficiencyBoostPercent: number;
        recommendation?: string;
        efficiencyByHour?: EfficiencyHour[];
    };
    type PerformanceItem = {
        subjectName: string;
        recentScoreAvg: number;
        historicalScoreAvg: number;
        improvementRate: number;
        pace: string;
        estimatedExamScore: number;
        estimatedPercentile: number;
    };

    const leakage = leakageData?.report;
    const peak = peakData?.data as PeakData | undefined;
    const performance = (performanceData?.data || []) as PerformanceItem[];

    return (
        <div className="space-y-6">
            {/* Time Leakage Report */}
            {leakage && (
                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-md border-red-500/20 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Time Leakage Report</h2>
                            <p className="text-sm text-slate-400">Last {leakage.periodDays} days</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Total Leakage</div>
                            <div className="text-2xl font-bold text-red-400">{leakage.totalLeakageMinutes} min</div>
                            <div className="text-xs text-slate-500 mt-1">{leakage.leakagePercentage.toFixed(1)}% of planned time</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Planned Time</div>
                            <div className="text-2xl font-bold text-white">{leakage.totalPlannedMinutes} min</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Actual Time</div>
                            <div className="text-2xl font-bold text-green-400">{leakage.totalActualMinutes} min</div>
                        </div>
                    </div>

                    {leakage.suggestion && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                            <p className="text-sm text-orange-400">💡 {leakage.suggestion}</p>
                        </div>
                    )}

                    {leakage.worstDays && leakage.worstDays.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Worst Days</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {leakage.worstDays.map((day, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                                        <div className="text-xs text-slate-400">{new Date(day.date).toLocaleDateString()}</div>
                                        <div className="text-lg font-bold text-red-400">{day.leakagePercent.toFixed(1)}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Peak Productivity Window */}
            {peak && (
                <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 backdrop-blur-md border-yellow-500/20 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl">
                            <Sun className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Peak Productivity Window</h2>
                            <p className="text-sm text-slate-400">Your most productive hours</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-2">Peak Hours</div>
                            <div className="text-3xl font-bold text-yellow-400">
                                {peak.peakWindow.startHour}:00 - {peak.peakWindow.endHour}:00
                            </div>
                            <div className="text-sm text-slate-300 mt-1">{peak.peakWindow.label}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-2">Efficiency Boost</div>
                            <div className="text-3xl font-bold text-green-400">+{peak.efficiencyBoostPercent}%</div>
                            <div className="text-sm text-slate-300 mt-1">vs. other hours</div>
                        </div>
                    </div>

                    {peak.recommendation && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <p className="text-sm text-yellow-400">💡 {peak.recommendation}</p>
                        </div>
                    )}

                    {/* Hourly Efficiency Chart */}
                    {peak.efficiencyByHour && peak.efficiencyByHour.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Hourly Efficiency</h3>
                            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
<<<<<<< HEAD
                                {peak.efficiencyByHour.map((hour: PeakProductivityResult['efficiencyByHour'][number]) => {
=======
                                {peak.efficiencyByHour.map((hour) => {
>>>>>>> origin/main
                                    const isPeak = hour.hour >= peak.peakWindow.startHour && hour.hour < peak.peakWindow.endHour;
                                    return (
                                        <div
                                            key={hour.hour}
                                            className={`p-2 rounded-lg text-center ${isPeak ? 'bg-yellow-500/20 border-yellow-500/40' : 'bg-white/5'
                                                } border border-white/10`}
                                        >
                                            <div className="text-xs text-slate-400">{hour.hour}h</div>
                                            <div className={`text-sm font-bold ${isPeak ? 'text-yellow-400' : 'text-white'}`}>
                                                {hour.avgMinutes}m
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Learning Pace Predictions */}
            {performance && performance.length > 0 && (
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md border-purple-500/20 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Learning Pace Predictions</h2>
                            <p className="text-sm text-slate-400">Subject-wise performance trends</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<<<<<<< HEAD
                        {performance.map((subject: LearningPace) => (
=======
                        {performance.map((subject) => (
>>>>>>> origin/main
                            <div key={subject.subjectName} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <h3 className="font-semibold text-white mb-3">{subject.subjectName}</h3>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Current Avg</span>
                                        <span className="text-white font-semibold">{subject.recentScoreAvg.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Historical Avg</span>
                                        <span className="text-slate-500">{subject.historicalScoreAvg.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Improvement</span>
                                        <span className={subject.improvementRate >= 0 ? 'text-green-400' : 'text-red-400'}>
                                            {subject.improvementRate >= 0 ? '+' : ''}{subject.improvementRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">Pace</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${subject.pace === 'accelerating' ? 'bg-green-500/20 text-green-400' :
                                        subject.pace === 'steady' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {subject.pace}
                                    </span>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <div className="text-xs text-slate-400 mb-1">Predicted Exam Score</div>
                                    <div className="text-2xl font-bold text-purple-400">{subject.estimatedExamScore.toFixed(1)}%</div>
                                    <div className="text-xs text-slate-500 mt-1">~{subject.estimatedPercentile}th percentile</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {!leakage && !peak && !performance && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-12 text-center">
                    <Clock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No productivity insights available yet. Keep logging your activities!</p>
                </Card>
            )}
        </div>
    );
}
