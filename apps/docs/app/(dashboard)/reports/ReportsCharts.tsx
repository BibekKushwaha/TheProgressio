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
    return (
        <>
            {/* Trend + Task bar charts side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Hours Trend */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Daily Hours Trend</h2>
                    <div className="h-64">
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
                    </div>
                </div>

                {/* Tasks Completed */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Tasks Completed</h2>
                    <div className="h-64">
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
                    </div>
                </div>
            </div>

            {/* Performance Radar */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Performance Overview</h2>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={categoryData}>
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
