'use client';

import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { PredictiveScoreCard } from '@/components/analytics/PredictiveScoreCard';
import { Swords, Target, BookOpen, Trophy } from 'lucide-react';
import { useGetAllSubjectPerformanceQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMemo } from 'react';

export default function ExamWarRoomPage() {
    const { data: performanceData, isLoading: perfLoading } = useGetAllSubjectPerformanceQuery();

    // Stable reference — prevents difficultyStats from recomputing on every render
    // when performanceData is undefined (new [] reference each time).
    const subjects = useMemo(() => performanceData?.data ?? [], [performanceData]);

    // Derive difficulty breakdown from already-fetched subject performance —
    // eliminates the useGetGradeEntriesQuery full table scan (no take/where).
    const difficultyStats = useMemo(() => {
        const stats = { easy: 0, medium: 0, hard: 0 };
        for (const subject of subjects) {
            const score = subject.avgScore ?? 0;
            if (score >= 80) stats.easy++;
            else if (score >= 50) stats.medium++;
            else stats.hard++;
        }
        return stats;
    }, [subjects]);
    const totalAttempts = difficultyStats.easy + difficultyStats.medium + difficultyStats.hard;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Exam War Room"
                subtitle="Chapter-wise SWOT, success tracking & predictive scores"
            />

            {/* Quick Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
                        <div className="text-sm text-slate-400 mb-1">Total Attempts</div>
                        <div className="text-3xl font-bold text-white">{totalAttempts}</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
                            <Trophy className="w-4 h-4" /> Easy Solved
                        </div>
                        <div className="text-3xl font-bold text-green-400">{difficultyStats.easy}</div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1">
                            <Target className="w-4 h-4" /> Medium Solved
                        </div>
                        <div className="text-3xl font-bold text-yellow-400">{difficultyStats.medium}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-sm text-red-400 mb-1">
                            <Swords className="w-4 h-4" /> Hard Solved
                        </div>
                        <div className="text-3xl font-bold text-red-400">{difficultyStats.hard}</div>
                    </div>
                </div>

                {/* Tabbed Content */}
                {/* Predictive Score Summary */}
                <PredictiveScoreCard />

                <SWOTAnalysis />

                {/* Subject Performance Summary */}
                {perfLoading ? (
                    <Skeleton className="h-48 w-full bg-white/5" />
                ) : subjects.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-orange-400" />
                            Subject Performance Summary
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subjects.map((subject) => (
                                <div key={subject.subjectName} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                    <h3 className="font-semibold text-white mb-2">{subject.subjectName}</h3>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Avg Score</span>
                                            <span className="text-white font-semibold">{subject.avgScore?.toFixed(1) || 'N/A'}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Entries</span>
                                            <span className="text-slate-300">{subject.entryCount || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Trend</span>
                                            <span className={subject.trend === 'improving' ? 'text-green-400' : subject.trend === 'declining' ? 'text-red-400' : 'text-yellow-400'}>
                                                {subject.trend || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
        </div>
    );
}
