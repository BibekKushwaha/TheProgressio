'use client';

import { useEffect, useState } from 'react';
import { useGetSWOTReportQuery, type FullSWOT } from '@repo/store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, AlertTriangle, Lightbulb, Search } from 'lucide-react';

interface SWOTAnalysisProps {
    examType?: string;
    allowExamTypeChange?: boolean;
    /** Pre-fetched SWOT data — skips the network round-trip when provided */
    initialData?: FullSWOT;
}

const EXAM_TYPE_OPTIONS = ['JEE', 'NEET', 'UPSC', 'Midterm', 'Final', 'Quiz'] as const;

export function SWOTAnalysis({ examType: controlledExamType, allowExamTypeChange = true, initialData }: SWOTAnalysisProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [examType, setExamType] = useState(controlledExamType || 'Midterm');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (controlledExamType) {
            setExamType(controlledExamType);
        }
    }, [controlledExamType]);

    const activeExamType = controlledExamType || examType;
    // Skip the network fetch when a parent has already retrieved SWOT data.
    const { data, isLoading } = useGetSWOTReportQuery(activeExamType, { skip: !!initialData });

    const swotData = initialData ?? data?.data;
    const filteredSubjects =
        swotData?.subjects.filter(subject =>
            subject.subject.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];

    if (!isMounted || isLoading) {
        return (
            <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-64 w-full bg-white/5" />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md border-blue-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">SWOT Analysis</h2>
                            <p className="text-sm text-slate-400">Strengths, Weaknesses, Opportunities, Threats</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 hidden md:flex">
                        <Input
                            placeholder="Search subjects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border-white/10 w-64"
                        />
                        {allowExamTypeChange && !controlledExamType && (
                            <select
                                value={examType}
                                onChange={(e) => setExamType(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            >
                                {EXAM_TYPE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {swotData && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Overall Readiness</div>
                            <div className="text-3xl font-bold text-blue-400">{swotData.overallReadiness.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Priority Chapters</div>
                            <div className="text-lg font-bold text-white">{swotData.topPriorityChapters.length}</div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Priority Chapters */}
            {swotData && swotData.topPriorityChapters.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        Top Priority Chapters
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {swotData.topPriorityChapters.map((chapter, idx) => (
                            <div key={idx} className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 font-semibold">
                                {chapter}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Subject-wise SWOT */}
            {filteredSubjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {filteredSubjects.map((subject) => (
                        <Card key={subject.subject} className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                            <h3 className="text-xl font-bold text-white mb-6">{subject.subject}</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths */}
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Strengths
                                    </h4>
                                    {subject.strengths.length > 0 ? (
                                        <ul className="space-y-2">
                                            {subject.strengths.map((item, idx) => (
                                                <li key={idx} className="flex items-center justify-between text-sm">
                                                    <span className="text-white">{item.chapter}</span>
                                                    <span className="text-green-400 font-semibold">{item.score}%</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500">No data available</p>
                                    )}
                                </div>

                                {/* Weaknesses */}
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Weaknesses
                                    </h4>
                                    {subject.weaknesses.length > 0 ? (
                                        <ul className="space-y-2">
                                            {subject.weaknesses.map((item, idx) => (
                                                <li key={idx} className="flex items-center justify-between text-sm">
                                                    <span className="text-white">{item.chapter}</span>
                                                    <span className="text-red-400 font-semibold">{item.score}%</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500">No data available</p>
                                    )}
                                </div>

                                {/* Opportunities */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4" />
                                        Opportunities
                                    </h4>
                                    {subject.opportunities.length > 0 ? (
                                        <ul className="space-y-2">
                                            {subject.opportunities.map((item, idx) => (
                                                <li key={idx} className="text-sm">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-white">{item.chapter}</span>
                                                        <span className="text-blue-400 font-semibold">{item.score}%</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{item.reason}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500">No data available</p>
                                    )}
                                </div>

                                {/* Threats */}
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Threats
                                    </h4>
                                    {subject.threats.length > 0 ? (
                                        <ul className="space-y-2">
                                            {subject.threats.map((item, idx) => (
                                                <li key={idx} className="text-sm">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-white">{item.chapter}</span>
                                                        <span className="text-orange-400 font-semibold">{item.score}%</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{item.reason}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500">No data available</p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-12 text-center">
                    <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No SWOT data available for the selected exam type.</p>
                </Card>
            )}
        </div>
    );
}
