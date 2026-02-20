'use client';

import React from 'react';
import { useGetTimeLeakageQuery, TimeLeakageReport } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TimeLeakageCardProps {
    /** Pre-fetched data from a BFF call. When provided the query is skipped. */
    initialData?: TimeLeakageReport;
}

export function TimeLeakageCard({ initialData }: TimeLeakageCardProps = {}) {
    const { data, isLoading } = useGetTimeLeakageQuery(7, { skip: !!initialData });
    const report = initialData ?? data?.report;

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-2xl" />;
    }

    if (!report) return null;

    const chartData = report.dailyBreakdown.map(day => ({
        date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        leakage: day.leakageMinutes,
        percent: day.leakagePercent
    }));

    return (
        <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        Time Leakage Audit
                    </CardTitle>
                    <p className="text-sm text-slate-400">Planned vs. Actual study time</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                    {report.leakagePercentage}% Leakage
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-bold text-white">{Math.round(report.totalLeakageMinutes / 60)}h</span>
                    <span className="text-slate-400 pb-1">lost over last {report.periodDays} days</span>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <div className="flex items-center gap-2 text-rose-300 font-semibold mb-1">
                            <TrendingDown className="w-4 h-4" />
                            AI Insight
                        </div>
                        <p className="text-sm text-slate-300 italic">&quot;{report.suggestion}&quot;</p>
                    </div>
                </div>

                <div className="h-[180px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="leakageGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="date"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#94a3b8' }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                itemStyle={{ color: '#fb7185' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="leakage"
                                stroke="#fb7185"
                                fillOpacity={1}
                                fill="url(#leakageGradient)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Daily Leakage (Minutes)
                </div>
            </CardContent>
        </Card>
    );
}
