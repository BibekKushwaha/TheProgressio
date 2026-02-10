'use client';

import { useState } from 'react';
import { GPACalculator } from '@/components/analytics/GPACalculator';
import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { ProductivityInsights } from '@/components/analytics/ProductivityInsights';
import { NotificationCenter } from '@/components/habit/NotificationCenter';
import { RotationManager } from '@/components/planner/RotationManager';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Target, TrendingUp, Bell, RotateCw } from 'lucide-react';

export default function AdvancedFeaturesPage() {
    const [activeTab, setActiveTab] = useState('gpa');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Advanced Features</h1>
                    <p className="text-slate-400">Powerful tools to enhance your productivity</p>
                </div>

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-5 w-full bg-white/5 border border-white/10 p-1">
                        <TabsTrigger
                            value="gpa"
                            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                        >
                            <GraduationCap className="w-4 h-4 mr-2" />
                            GPA
                        </TabsTrigger>
                        <TabsTrigger
                            value="swot"
                            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                        >
                            <Target className="w-4 h-4 mr-2" />
                            SWOT
                        </TabsTrigger>
                        <TabsTrigger
                            value="insights"
                            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Insights
                        </TabsTrigger>
                        <TabsTrigger
                            value="notifications"
                            className="data-[state=active]:bg-pink-500 data-[state=active]:text-white"
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger
                            value="rotations"
                            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
                        >
                            <RotateCw className="w-4 h-4 mr-2" />
                            Rotations
                        </TabsTrigger>
                    </TabsList>

                    {/* GPA Calculator */}
                    <TabsContent value="gpa" className="mt-6">
                        <GPACalculator />
                    </TabsContent>

                    {/* SWOT Analysis */}
                    <TabsContent value="swot" className="mt-6">
                        <SWOTAnalysis />
                    </TabsContent>

                    {/* Productivity Insights */}
                    <TabsContent value="insights" className="mt-6">
                        <ProductivityInsights />
                    </TabsContent>

                    {/* Notifications */}
                    <TabsContent value="notifications" className="mt-6">
                        <NotificationCenter />
                    </TabsContent>

                    {/* Rotation Manager */}
                    <TabsContent value="rotations" className="mt-6">
                        <RotationManager />
                    </TabsContent>
                </Tabs>

                {/* Feature Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 p-6">
                        <GraduationCap className="w-8 h-8 text-indigo-400 mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">Academic Analytics</h3>
                        <p className="text-sm text-slate-400">
                            Track your GPA, analyze strengths & weaknesses, and get personalized study recommendations.
                        </p>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-6">
                        <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">Productivity Insights</h3>
                        <p className="text-sm text-slate-400">
                            Discover your peak hours, identify time leaks, and optimize your study schedule.
                        </p>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 p-6">
                        <RotateCw className="w-8 h-8 text-cyan-400 mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">Smart Scheduling</h3>
                        <p className="text-sm text-slate-400">
                            Manage rotation patterns, get habit nudges, and stay on top of your timetable.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
