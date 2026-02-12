"use client"
import { useEffect, useMemo, useState } from 'react';
import { AnalyticsHeader } from '@/components/analytics/AnalyticHeader';
import { StatCards } from '@/components/analytics/StatCard';
import { FocusTrends } from '@/components/analytics/FocusTrend';
import { SessionBreakdown } from '@/components/analytics/SessionBreakdown';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatMap';
import { DurationPredictionCard } from '@/components/analytics/DurationPredictionCard';
import { ProductivityInsights } from '@/components/analytics/ProductivityInsights';
import { GradeEntryManager } from '@/components/analytics/GradeEntryManager';
import { PredictiveScoreCard } from '@/components/analytics/PredictiveScoreCard';
import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { GPACalculator } from '@/components/analytics/GPACalculator';
import { RevisionScheduler } from '@/components/analytics/RevisionScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { TaskStatus, useGetDailySummaryQuery, useGetFocusScoreQuery, useGetTasksQuery, useGetWeeklyTrendsQuery } from '@repo/store';
import { BrainCircuit, FileSpreadsheet, GraduationCap, Sparkles, Wand2 } from 'lucide-react';
import { GlassHero } from '@/components/layout/GlassHero';

export default function AnalyticsPage() {
    const [pastDays, setPastDays] = useState("1");
    const [activeView, setActiveView] = useState('overview');
    const [selectedPredictionTaskId, setSelectedPredictionTaskId] = useState('');
    const { data: allTasks } = useGetTasksQuery({ limit: 100 });
    const { data: summaryData } = useGetDailySummaryQuery(pastDays);
    const { data: focusScoreData } = useGetFocusScoreQuery();
    const { data: trendsData } = useGetWeeklyTrendsQuery();

    const predictionTaskOptions = useMemo(() => {
        if (!allTasks) return [];
        return [...allTasks]
            .filter((task) => task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS)
            .sort((a, b) => {
                const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                return aTime - bTime;
            });
    }, [allTasks]);

    useEffect(() => {
        if (predictionTaskOptions.length === 0) {
            setSelectedPredictionTaskId('');
            return;
        }

        const selectedExists = predictionTaskOptions.some((task) => task.id === selectedPredictionTaskId);
        if (!selectedExists) {
            setSelectedPredictionTaskId(predictionTaskOptions[0]?.id || '');
        }
    }, [predictionTaskOptions, selectedPredictionTaskId]);

    const selectedTask = useMemo(
        () => predictionTaskOptions.find((task) => task.id === selectedPredictionTaskId),
        [predictionTaskOptions, selectedPredictionTaskId]
    );

    const handleExportReport = () => {
        const generatedAt = new Date();
        const payload = {
            generatedAt: generatedAt.toISOString(),
            filters: {
                pastDays,
                selectedPredictionTaskId: selectedPredictionTaskId || null,
            },
            summary: summaryData?.stats ?? null,
            focusScore: focusScoreData?.stats ?? null,
            weeklyTrends: trendsData?.data ?? [],
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `analytics-report-${generatedAt.toISOString().split('T')[0] || 'report'}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
            <div className="flex">
                <div className="flex-1 flex flex-col">
                    <AnalyticsHeader pastDays={pastDays} setPastDays={setPastDays} onExport={handleExportReport} />
                    <main className="flex-1 p-4 md:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto space-y-8">
                            <GlassHero
                                className="bg-gradient-to-br from-cyan-500/[0.10] via-indigo-500/[0.08] to-fuchsia-500/[0.08]"
                                topGlowClassName="-top-24 -right-20 h-72 w-72 bg-cyan-500/20"
                                bottomGlowClassName="-bottom-24 -left-16 h-72 w-72 bg-fuchsia-500/15"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs text-cyan-100 mb-4">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Next-Level Productivity Intelligence
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                                            Analyze focus, predict duration, and optimize study outcomes in one workspace.
                                        </h2>
                                        <p className="mt-3 text-sm md:text-base text-slate-300 max-w-2xl">
                                            Switch between overview metrics, strategic predictions, and academic planning tools without leaving the analytics dashboard.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md p-4">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200 mb-3">
                                            <BrainCircuit className="w-4 h-4" />
                                            ML Duration Prediction Context
                                        </div>
                                        <Select
                                            value={selectedPredictionTaskId}
                                            onChange={(e) => setSelectedPredictionTaskId(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white"
                                        >
                                            <option value="" className="bg-slate-900">Select task for prediction</option>
                                            {predictionTaskOptions.map((task) => (
                                                <option key={task.id} value={task.id} className="bg-slate-900">
                                                    {task.title}
                                                </option>
                                            ))}
                                        </Select>
                                        <p className="mt-3 text-xs text-slate-300">
                                            {selectedTask?.dueDate
                                                ? `Due ${new Date(selectedTask.dueDate).toLocaleDateString()}`
                                                : 'Choose a pending/in-progress task to enable prediction.'}
                                        </p>
                                    </div>
                                </div>
                            </GlassHero>

                            <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
                                <TabsList className="h-auto p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                                    <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 flex items-center gap-2 data-[state=active]:bg-cyan-500/20">
                                        <Wand2 className="w-4 h-4" />
                                        Overview
                                    </TabsTrigger>
                                    <TabsTrigger value="strategic" className="rounded-xl px-4 py-2.5 flex items-center gap-2 data-[state=active]:bg-indigo-500/20">
                                        <BrainCircuit className="w-4 h-4" />
                                        Strategic
                                    </TabsTrigger>
                                    <TabsTrigger value="academic" className="rounded-xl px-4 py-2.5 flex items-center gap-2 data-[state=active]:bg-fuchsia-500/20">
                                        <GraduationCap className="w-4 h-4" />
                                        Academic Lab
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-6">
                                    <StatCards pastDays={pastDays} />
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2">
                                            <FocusTrends pastDays={pastDays} />
                                        </div>
                                        <div>
                                            <SessionBreakdown pastDays={pastDays} />
                                        </div>
                                    </div>
                                    <ActivityHeatmap pastDays={pastDays} />
                                </TabsContent>

                                <TabsContent value="strategic" className="space-y-6">
                                    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.5fr] gap-6">
                                        <DurationPredictionCard taskId={selectedPredictionTaskId || undefined} />
                                        <PredictiveScoreCard />
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                                        <ProductivityInsights />
                                    </div>
                                </TabsContent>

                                <TabsContent value="academic" className="space-y-6">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <GradeEntryManager />
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                                            <PredictiveScoreCard />
                                        </div>
                                    </div>
                                    <SWOTAnalysis />
                                    <GPACalculator />
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
                                            <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
                                            Revision Planner
                                        </div>
                                        <RevisionScheduler />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
