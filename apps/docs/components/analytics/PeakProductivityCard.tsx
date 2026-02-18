'use client';

import React from 'react';
import { useGetPeakWindowQuery } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Zap, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function PeakProductivityCard() {
    const { data, isLoading } = useGetPeakWindowQuery(14); // Last 14 days
    const peak = data?.data;

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-2xl" />;
    }

    if (!peak) return null;

    const chartData = peak.efficiencyByHour.map(item => ({
        hour: `${item.hour}:00`,
        efficiency: Math.round(item.avgFocusRatio * 100),
        sessions: item.sessionCount,
        originalHour: item.hour
    }));

    const isPeakHour = (hour: number) => {
        return hour >= peak.peakWindow.startHour && hour <= peak.peakWindow.endHour;
    };

    return (
        <Card variant="glass" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Peak Productivity
                    </CardTitle>
                    <p className="text-sm text-slate-400">Biological prime time analysis</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold">
                    +{peak.efficiencyBoostPercent}% Efficiency
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Peak Window</div>
                            <div className="text-lg font-bold text-white">{peak.peakWindow.label}</div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Recommendation</div>
                            <div className="text-sm font-medium text-slate-200 leading-tight">
                                {peak.recommendation}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-[200px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="hour"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#94a3b8' }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={isPeakHour(entry.originalHour) ? '#6366f1' : '#1e293b'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Hourly Efficiency (Focus Ratio %)
                </div>
            </CardContent>
        </Card>
    );
}
