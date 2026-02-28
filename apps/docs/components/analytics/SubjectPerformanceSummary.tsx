'use client';

import { BookOpen } from 'lucide-react';
import { useGetAllSubjectPerformanceQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

export function SubjectPerformanceSummary() {
    const { data: performanceData, isLoading: perfLoading } = useGetAllSubjectPerformanceQuery();
    const subjects = performanceData?.data ?? [];

    const formatAvgScore = (score?: number | null) =>
        typeof score === 'number' ? `${score.toFixed(1)}%` : 'N/A';

    if (perfLoading) {
        return <Skeleton className="h-48 w-full bg-white/5" />;
    }

    if (subjects.length === 0) {
        return null; // Or return a fallback UI
    }

    return (
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
                                <span className="text-white font-semibold">{formatAvgScore(subject.avgScore)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Entries</span>
                                <span className="text-slate-300">{subject.entryCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Trend</span>
                                <span className={
                                    subject.trend === 'improving' ? 'text-green-400' :
                                        subject.trend === 'declining' ? 'text-red-400' : 'text-yellow-400'
                                }>
                                    {subject.trend || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
