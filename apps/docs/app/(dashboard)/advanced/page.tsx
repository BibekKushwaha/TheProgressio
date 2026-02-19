'use client';

import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { GPACalculator } from '@/components/analytics/GPACalculator';
import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { ProductivityInsights } from '@/components/analytics/ProductivityInsights';
import { NotificationCenter } from '@/components/habit/NotificationCenter';
import { RotationManager } from '@/components/planner/RotationManager';
import { ClassManager } from '@/components/planner/ClassManager';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Bell,
    Calendar,
    GraduationCap,
    RotateCw,
    Sparkles,
    Target,
    TrendingUp,
} from 'lucide-react';

type TabId = 'gpa' | 'swot' | 'insights' | 'notifications' | 'rotations' | 'timetable';

const TAB_ITEMS: Array<{
    id: TabId;
    label: string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
}> = [
        { id: 'gpa', label: 'GPA Lab', icon: GraduationCap, tone: 'from-indigo-500/20 to-violet-500/10 border-indigo-400/20' },
        { id: 'swot', label: 'SWOT Matrix', icon: Target, tone: 'from-blue-500/20 to-cyan-500/10 border-blue-400/20' },
        { id: 'insights', label: 'Productivity AI', icon: TrendingUp, tone: 'from-fuchsia-500/20 to-purple-500/10 border-fuchsia-400/20' },
        { id: 'notifications', label: 'Nudge Center', icon: Bell, tone: 'from-pink-500/20 to-rose-500/10 border-pink-400/20' },
        { id: 'rotations', label: 'Rotation Ops', icon: RotateCw, tone: 'from-cyan-500/20 to-sky-500/10 border-cyan-400/20' },
        { id: 'timetable', label: 'Class Master', icon: Calendar, tone: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/20' },
    ];

export default function AdvancedFeaturesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('gpa');

    const currentTabMeta = useMemo(
        () => TAB_ITEMS.find((item) => item.id === activeTab) ?? TAB_ITEMS[0]!,
        [activeTab]
    );
    const ActiveTabIcon = currentTabMeta.icon;

    return (
        <div className="space-y-7">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.10] via-indigo-500/[0.08] to-fuchsia-500/[0.10] p-6 md:p-8">
                    <div className="absolute -top-16 -right-10 h-60 w-60 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-10 h-60 w-60 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

                    <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs text-cyan-100 mb-4">
                                <Sparkles className="w-3.5 h-3.5" />
                                Advanced Command Center
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">
                                High-Leverage Productivity Toolkit
                            </h1>
                            <p className="mt-3 text-slate-300 max-w-2xl">
                                Use deep analytics, smart nudges, and rotation controls to run your
                                study workflow with precision.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                                Active Module
                            </p>
                            <div className={`rounded-xl border p-3 bg-gradient-to-br ${currentTabMeta.tone}`}>
                                <div className="flex items-center gap-2 text-white font-semibold">
                                    <ActiveTabIcon className="w-4 h-4" />
                                    {currentTabMeta.label}
                                </div>
                                <p className="mt-1 text-xs text-slate-200">
                                    Configure and execute this module to improve planning quality and output.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="w-full space-y-6">
                    <TabsList className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 h-auto w-full bg-white/5 border border-white/10 p-1.5 rounded-2xl">
                        {TAB_ITEMS.map((item) => (
                            <TabsTrigger
                                key={item.id}
                                value={item.id}
                                className="rounded-xl px-3 py-2.5 text-sm data-[state=active]:bg-white/15 data-[state=active]:text-white"
                            >
                                <item.icon className="w-4 h-4 mr-2" />
                                {item.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="gpa" className="space-y-6">
                        <GPACalculator />
                    </TabsContent>

                    <TabsContent value="swot" className="space-y-6">
                        <SWOTAnalysis />
                    </TabsContent>

                    <TabsContent value="insights" className="space-y-6">
                        <ProductivityInsights />
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6">
                        <NotificationCenter />
                    </TabsContent>

                    <TabsContent value="rotations" className="space-y-6">
                        <RotationManager />
                    </TabsContent>

                    <TabsContent value="timetable" className="space-y-6">
                        <ClassManager />
                    </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 p-5">
                        <GraduationCap className="w-7 h-7 text-indigo-200 mb-3" />
                        <h3 className="font-semibold text-white">Academic Diagnostics</h3>
                        <p className="text-sm text-slate-300 mt-1">
                            Use GPA + SWOT modules to identify weak zones and rebalance effort.
                        </p>
                    </Card>

                    <Card className="border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/20 to-purple-500/10 p-5">
                        <TrendingUp className="w-7 h-7 text-fuchsia-200 mb-3" />
                        <h3 className="font-semibold text-white">Behavior Intelligence</h3>
                        <p className="text-sm text-slate-300 mt-1">
                            Read time leakage and peak-window recommendations to tighten your routine.
                        </p>
                    </Card>

                    <Card className="border border-cyan-400/20 bg-gradient-to-br from-cyan-500/20 to-sky-500/10 p-5">
                        <RotateCw className="w-7 h-7 text-cyan-200 mb-3" />
                        <h3 className="font-semibold text-white">Execution Controls</h3>
                        <p className="text-sm text-slate-300 mt-1">
                            Apply rotation patterns and nudges to keep daily operations aligned.
                        </p>
                    </Card>
                </div>
            </div>
    );
}
