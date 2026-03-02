'use client';

import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { PredictiveScoreCard } from '@/components/analytics/PredictiveScoreCard';
import { Swords, Target, Trophy } from 'lucide-react';
import { useGetAllSubjectPerformanceQuery } from '@repo/store';
import { PageHeader } from '@/components/layout/PageHeader';
import { SubjectPerformanceSummary } from '@/components/analytics/SubjectPerformanceSummary';
import { useMemo } from 'react';

export default function ExamWarRoomPage() {
    const { data: performanceData, isLoading } = useGetAllSubjectPerformanceQuery();

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
                    <div className="text-3xl font-bold text-white">
                        {isLoading ? <div className="h-9 w-16 bg-white/10 rounded animate-pulse" /> : totalAttempts}
                    </div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
                        <Trophy className="w-4 h-4" /> Strong (≥80%)
                    </div>
                    <div className="text-3xl font-bold text-green-400">
                        {isLoading ? <div className="h-9 w-16 bg-green-500/20 rounded animate-pulse" /> : difficultyStats.easy}
                    </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1">
                        <Target className="w-4 h-4" /> Developing (50–79%)
                    </div>
                    <div className="text-3xl font-bold text-yellow-400">
                        {isLoading ? <div className="h-9 w-16 bg-yellow-500/20 rounded animate-pulse" /> : difficultyStats.medium}
                    </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-sm text-red-400 mb-1">
                        <Swords className="w-4 h-4" /> Needs Work (&lt;50%)
                    </div>
                    <div className="text-3xl font-bold text-red-400">
                        {isLoading ? <div className="h-9 w-16 bg-red-500/20 rounded animate-pulse" /> : difficultyStats.hard}
                    </div>
                </div>
            </div>

            {/* Tabbed Content */}
            {/* Predictive Score Summary */}
            <PredictiveScoreCard />

            <SWOTAnalysis />

            {/* Subject Performance Summary */}
            <SubjectPerformanceSummary />
        </div>
    );
}
