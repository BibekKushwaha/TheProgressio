"use client";

import React from "react";
import { BarChart2, Clock, Calendar as CalendarIcon, Zap, PieChart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell } from "recharts";
import GlassCard from "../../components/ui/glass-card";
import PageHeader from "../../components/ui/page-header";

const AnalyticsPage = () => {
    // Mock Data
    const trendsData = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        focus: Math.floor(Math.random() * 8) + 2 // 2-10 hours
    }));

    const sessionData = [
        { name: "Deep Work", value: 65, color: "#6366F1" }, // Indigo
        { name: "Pomodoro", value: 25, color: "#EC4899" }, // Pink
        { name: "Break", value: 10, color: "#10B981" },   // Emerald
    ];

    const heatmapData = Array.from({ length: 52 }, () =>
        Array.from({ length: 7 }, () => Math.floor(Math.random() * 5))
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader title="Analytics" description="Deep dive into your productivity metrics" />

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Focus", value: "124h", extra: "+12% vs last month", icon: Clock, color: "text-indigo-400" },
                    { label: "Sessions", value: "85", extra: "Avg 4/day", icon: Zap, color: "text-yellow-400" },
                    { label: "Focus Score", value: "88", extra: "Top 5% of users", icon: BarChart2, color: "text-green-400" },
                    { label: "Best Day", value: "Tuesday", extra: "Avg 6.5h", icon: CalendarIcon, color: "text-pink-400" },
                ].map((stat, i) => (
                    <GlassCard key={i} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 text-sm font-medium">{stat.label}</span>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                        <p className="text-xs text-gray-500">{stat.extra}</p>
                    </GlassCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Trends Chart */}
                <GlassCard className="lg:col-span-2 p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Focus Trends (30 Days)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendsData}>
                                <defs>
                                    <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} interval={5} />
                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="focus" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocus)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Session Breakdown */}
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Session Breakdown</h3>
                    <div className="h-[200px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sessionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sessionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-2xl font-bold text-white">100%</span>
                            <span className="text-xs text-gray-500">Efficiency</span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-3">
                        {sessionData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-gray-300">{item.name}</span>
                                </div>
                                <span className="text-white font-medium">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Github Style Heatmap */}
            <GlassCard className="p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-white mb-6">Activity Heatmap</h3>
                <div className="flex gap-1 min-w-max">
                    {heatmapData.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((dayVal, dIndex) => (
                                <div
                                    key={dIndex}
                                    className={`w-3 h-3 rounded-sm ${dayVal === 0 ? 'bg-white/5' :
                                        dayVal === 1 ? 'bg-green-900' :
                                            dayVal === 2 ? 'bg-green-700' :
                                                dayVal === 3 ? 'bg-green-500' : 'bg-green-400'
                                        }`}
                                    title={`Activity: ${dayVal} hours`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};

export default AnalyticsPage;
