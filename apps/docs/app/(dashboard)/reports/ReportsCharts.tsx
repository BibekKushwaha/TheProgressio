"use client";

// This file is the sole owner of the recharts import — it is loaded via
// next/dynamic in page.tsx so the heavy recharts bundle is split into its
// own lazy chunk and doesn't block the initial route paint.

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from "recharts";

interface WeeklyDataPoint {
    day: string;
    hours?: number;
    tasks?: number;
    [key: string]: unknown;
}

interface CategoryDataPoint {
    category: string;
    value: number;
}

interface ReportsChartsProps {
    weeklyData: WeeklyDataPoint[];
    categoryData: CategoryDataPoint[];
}

export default function ReportsCharts({ weeklyData, categoryData }: ReportsChartsProps) {
    const hasWeeklyData = weeklyData.some((point) => (point.hours ?? 0) > 0 || (point.tasks ?? 0) > 0);
    const safeCategoryData = categoryData.length > 0
        ? categoryData
        : [
            { category: "Consistency", value: 0 },
            { category: "Intensity", value: 0 },
            { category: "Depth", value: 0 },
            { category: "Efficiency", value: 0 },
            { category: "Balance", value: 0 },
        ];

    return (
        <>
            {/* Trend + Task bar charts side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Hours Trend */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Daily Hours Trend</h2>
                    <div className="h-64">
                        {hasWeeklyData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-slate-400">
                                Daily focus trend will appear after you log a few study sessions this week.
                            </div>
                        )}
                    </div>
                </div>

                {/* Tasks Completed */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Tasks Completed</h2>
                    <div className="h-64">
                        {hasWeeklyData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="tasks" fill="url(#taskGradient)" radius={[8, 8, 0, 0]} />
                                    <defs>
                                        <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#a855f7" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-slate-400">
                                Task completion bars will appear after you finish some tracked work this week.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Performance Radar */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Performance Overview</h2>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={safeCategoryData}>
                            <PolarGrid stroke="#ffffff20" />
                            <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                            <PolarRadiusAxis stroke="#94a3b8" fontSize={12} />
                            <Radar name="Performance" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}
