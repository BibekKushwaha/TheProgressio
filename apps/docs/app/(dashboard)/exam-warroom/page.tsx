'use client';

import { useState } from 'react';
import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { GradeEntryManager } from '@/components/analytics/GradeEntryManager';
import { ProductivityInsights } from '@/components/analytics/ProductivityInsights';
import { PredictiveScoreCard } from '@/components/analytics/PredictiveScoreCard';
import { RevisionScheduler } from '@/components/analytics/RevisionScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Swords, Target, TrendingUp, BookOpen, Trophy, BarChart3, CalendarDays } from 'lucide-react';
import { useGetSubjectPerformanceQuery, useGetGradeEntriesQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExamWarRoomPage() {
    const [activeTab, setActiveTab] = useState('swot');
    const { data: performanceData, isLoading: perfLoading } = useGetSubjectPerformanceQuery('Mathematics');
    const { data: gradeData } = useGetGradeEntriesQuery();

    const grades = gradeData?.entries || [];

    // Difficulty breakdown from grade entries
    const difficultyStats = grades.reduce(
        (acc, entry) => {
            const pct = (entry.obtainedMarks / entry.totalMarks) * 100;
            const type = entry.examType?.toLowerCase() || 'practice';
            if (type.includes('easy') || pct >= 80) acc.easy++;
            else if (type.includes('hard') || pct < 50) acc.hard++;
            else acc.medium++;
            return acc;
        },
        { easy: 0, medium: 0, hard: 0 }
    );
    const totalAttempts = difficultyStats.easy + difficultyStats.medium + difficultyStats.hard;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/30 to-slate-950 text-white p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg shadow-red-500/20">
                        <Swords className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                            Exam War Room
                        </h1>
                        <p className="text-slate-400 mt-1">Chapter-wise SWOT, success tracking & predictive scores for JEE/NEET/UPSC</p>
                    </div>
                </div>

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

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-white/5 border border-white/10 p-1">
                        <TabsTrigger
                            value="swot"
                            className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
                        >
                            <Target className="w-4 h-4 mr-2" /> SWOT
                        </TabsTrigger>
                        <TabsTrigger
                            value="grades"
                            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                        >
                            <BookOpen className="w-4 h-4 mr-2" /> Grades
                        </TabsTrigger>
                        <TabsTrigger
                            value="predictions"
                            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" /> Predictions
                        </TabsTrigger>
                        <TabsTrigger
                            value="scores"
                            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" /> Scores
                        </TabsTrigger>
                        <TabsTrigger
                            value="revision"
                            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
                        >
                            <CalendarDays className="w-4 h-4 mr-2" /> Revision
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="swot" className="mt-6">
                        <SWOTAnalysis />
                    </TabsContent>

                    <TabsContent value="grades" className="mt-6">
                        <GradeEntryManager />
                    </TabsContent>

                    <TabsContent value="predictions" className="mt-6">
                        <ProductivityInsights />
                    </TabsContent>

                    <TabsContent value="scores" className="mt-6">
                        <PredictiveScoreCard />
                    </TabsContent>

                    <TabsContent value="revision" className="mt-6">
                        <RevisionScheduler />
                    </TabsContent>
                </Tabs>

                {/* Subject Performance Summary */}
                {perfLoading ? (
                    <Skeleton className="h-48 w-full bg-white/5" />
                ) : performanceData?.data && performanceData.data.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-orange-400" />
                            Subject Performance Summary
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {performanceData.data.map((subject: any) => (
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
        </div>
    );
}
