"use client";

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
} from "recharts";

interface WeeklyDataPoint {
    day: string;
    hours?: number;
    tasks?: number;
    [key: string]: unknown;
}

interface WeeklyReportChartsProps {
    weeklyData: WeeklyDataPoint[];
}

export function WeeklyReportCharts({ weeklyData }: WeeklyReportChartsProps) {
    const hasWeeklyData = weeklyData.some((point) => (point.hours ?? 0) > 0 || (point.tasks ?? 0) > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    );
}
