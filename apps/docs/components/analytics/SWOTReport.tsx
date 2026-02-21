'use client';

import React from 'react';
import { useGetSWOTReportQuery, FullSWOT } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ShieldCheck,
    ShieldAlert,
    Lightbulb,
    AlertCircle,
    Target,
    Loader2,
    Flame,
    Zap,
    ArrowRight
} from 'lucide-react';

interface SWOTReportProps {
    /** Pre-fetched data from a BFF call. When provided the query is skipped. */
    initialData?: FullSWOT;
}

export function SWOTReport({ initialData }: SWOTReportProps = {}) {
    const { data, isLoading } = useGetSWOTReportQuery('JEE', { skip: !!initialData });
    const swot = initialData ?? data?.data;

    if (isLoading) {
        return (
            <Card variant="glass" className="h-[500px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">Analyzing examination SWOT...</p>
                </div>
            </Card>
        );
    }

    if (!swot || swot.subjects.length === 0) {
        return (
            <Card variant="glass" className="p-12 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                    <Target className="w-12 h-12 text-slate-600 mx-auto" />
                    <CardTitle>SWOT Analysis Pending</CardTitle>
                    <CardDescription>
                        Complete more practice tests and log your scores to generate a strategic SWOT report for your exam.
                    </CardDescription>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Readiness Score */}
                <Card variant="glass" className="relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-400 text-xs uppercase tracking-widest font-bold">Overall Readiness</CardTitle>
                        <div className="text-4xl font-black text-white mt-1">
                            {swot.overallReadiness.toFixed(1)}%
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000"
                                style={{ width: `${swot.overallReadiness}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                            Calculated across {swot.subjects.length} subjects using Bayesian weighting based on recent test performance and pace.
                        </p>
                    </CardContent>
                    <div className="absolute top-4 right-4 p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                        <Flame className="w-6 h-6" />
                    </div>
                </Card>

                {/* Priority Chapters */}
                <Card variant="glass" className="border-red-500/20 shadow-red-500/5 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-red-400 text-xs uppercase tracking-widest font-bold">Current Blocking Chapters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {swot.topPriorityChapters.length > 0 ? (
                            swot.topPriorityChapters.map((chapter, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-lg group hover:bg-red-500/20 transition-all">
                                    <span className="text-sm text-red-100 font-medium truncate max-w-[200px]">{chapter}</span>
                                    <ArrowRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-xs italic py-4">No critical blockers identified.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Subject Level SWOT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {swot.subjects.map((sub) => (
                    <Card key={sub.subject} variant="glass" className="overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/5 py-4">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                {sub.subject}
                                <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400">Strategic</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-2">
                                {/* Strengths */}
                                <div className="p-4 border-r border-b border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                        <ShieldCheck className="w-4 h-4" />
                                        Strengths
                                    </div>
                                    <div className="space-y-1">
                                        {sub.strengths.slice(0, 2).map((s, i) => (
                                            <div key={i} className="text-[10px] text-slate-400 leading-tight">
                                                {s.chapter} ({s.score}%)
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Weaknesses */}
                                <div className="p-4 border-b border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                                        <ShieldAlert className="w-4 h-4" />
                                        Weaknesses
                                    </div>
                                    <div className="space-y-1">
                                        {sub.weaknesses.slice(0, 2).map((w, i) => (
                                            <div key={i} className="text-[10px] text-slate-400 leading-tight">
                                                {w.chapter} ({w.score}%)
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Opportunities */}
                                <div className="p-4 border-r border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                                        <Lightbulb className="w-4 h-4" />
                                        Opportunities
                                    </div>
                                    <div className="space-y-1">
                                        {sub.opportunities.slice(0, 1).map((o, i) => (
                                            <div key={i} className="text-[10px] text-slate-400 leading-tight">
                                                {o.chapter}
                                                <div className="text-[8px] text-orange-500/60 font-medium italic">{o.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Threats */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                                        <AlertCircle className="w-4 h-4" />
                                        Threats
                                    </div>
                                    <div className="space-y-1">
                                        {sub.threats.slice(0, 1).map((t, i) => (
                                            <div key={i} className="text-[10px] text-slate-400 leading-tight">
                                                {t.chapter}
                                                <div className="text-[8px] text-amber-500/60 font-medium italic">{t.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-4 items-start">
                <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-100/70 leading-relaxed">
                    {swot.topPriorityChapters.length > 0 ? (
                        <>
                            <strong>AI Recommendation:</strong> Our analysis suggests focusing on{' '}
                            <span className="text-white font-bold">{swot.topPriorityChapters[0]}</span>{' '}
                            for at least 4 hours this week. Your performance in{' '}
                            {swot.subjects[0]?.subject} subjects shows high stability, providing a clear window for aggressive focus on weak points.
                        </>
                    ) : (
                        <>
                            <strong>AI Recommendation:</strong> Keep logging practice tests to unlock personalised chapter-level recommendations.
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

