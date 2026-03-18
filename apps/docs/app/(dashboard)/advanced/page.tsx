'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Bell,
    Calendar,
    GraduationCap,
    RotateCw,
    Sparkles,
    TrendingUp,
} from 'lucide-react';

// Lazy-load each tab panel — they are large, chart-heavy components that should
// not inflate the initial JS bundle when the user may never visit their tab.
const TabFallback = () => <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />;


const NotificationCenter = dynamic(() => import('@/components/habit/NotificationCenter').then(m => ({ default: m.NotificationCenter })), { ssr: false, loading: TabFallback });
const RotationManager = dynamic(() => import('@/components/planner/RotationManager').then(m => ({ default: m.RotationManager })), { ssr: false, loading: TabFallback });
const ClassManager = dynamic(() => import('@/components/planner/ClassManager').then(m => ({ default: m.ClassManager })), { ssr: false, loading: TabFallback });

type TabId = 'notifications' | 'rotations' | 'timetable';

const TAB_ITEMS: Array<{
    id: TabId;
    label: string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
}> = [
        { id: 'notifications', label: 'Nudge Center', icon: Bell, tone: 'from-pink-500/20 to-rose-500/10 border-pink-400/20' },
        { id: 'rotations', label: 'Rotation Ops', icon: RotateCw, tone: 'from-cyan-500/20 to-sky-500/10 border-cyan-400/20' },
        { id: 'timetable', label: 'Class Master', icon: Calendar, tone: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/20' },
    ];

export default function AdvancedFeaturesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('notifications');

    const currentTabMeta = TAB_ITEMS.find((item) => item.id === activeTab) ?? TAB_ITEMS[0]!;
    const ActiveTabIcon = currentTabMeta.icon;

    return (
        <div className="space-y-7">
            <div
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.10] via-indigo-500/[0.08] to-fuchsia-500/[0.10] p-6 md:p-8"
                style={{
                    backgroundImage:
                        'radial-gradient(ellipse 450px 450px at -5% -15%, rgba(34,211,238,0.06) 0%, transparent 70%), ' +
                        'radial-gradient(ellipse 450px 450px at 105% 110%, rgba(139,92,246,0.06) 0%, transparent 70%)',
                }}
            >
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
                <TabsList className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 h-auto w-full bg-white/5 border border-white/10 p-1.5 rounded-2xl">
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

                {/* Conditionally render only the active tab to avoid mounting all
                    6 components (and their queries) on page load. */}
                <TabsContent value="notifications" className="space-y-6">{activeTab === 'notifications' && <NotificationCenter />}</TabsContent>
                <TabsContent value="rotations" className="space-y-6">{activeTab === 'rotations' && <RotationManager />}</TabsContent>
                <TabsContent value="timetable" className="space-y-6">{activeTab === 'timetable' && <ClassManager />}</TabsContent>
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
