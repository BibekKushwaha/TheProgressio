'use client';

import React from 'react';
import { useGetCycleTimeQuery } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine, CartesianGrid } from 'recharts';

export function CycleTimeScatterPlot() {
    const { data, isLoading, error } = useGetCycleTimeQuery();

    if (isLoading) {
        return (
            <Card variant="glass" className="h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-400">Calculating cycle times...</p>
                </div>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card variant="glass" className="h-[400px] flex items-center justify-center p-6 text-center">
                <div className="space-y-2">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                    <CardTitle>Insufficient Data</CardTitle>
                    <CardDescription>We need at least 5 completed tasks to calculate accurate cycle time percentiles.</CardDescription>
                </div>
            </Card>
        );
    }

    const { p50, p85, p95, avg, recentTasks } = data.data;

    // Format data for Scatter Chart
    // x: index or date, y: cycleTimeHours
    const chartData = recentTasks.map((task: { title: string; cycleTimeHours: number; completedAt: string }, index: number) => ({
        ...task,
        index: index + 1,
        x: index + 1,
        y: task.cycleTimeHours,
    })).reverse(); // Show oldest to newest

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
        if (active && payload && payload.length) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const task = (payload[0] as any).payload;
            return (
                <div className="bg-slate-900/95 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-xs font-bold text-white mb-1">{task.title}</p>
                    <p className="text-xs text-indigo-300">Cycle Time: {task.cycleTimeHours.toFixed(1)} hrs</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card variant="glass" className="overflow-hidden border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle>Strategic Cycle Time</CardTitle>
                            <CardDescription>Task completion velocity & predictive percentiles</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Average</div>
                        <div className="text-xl font-bold text-white">{avg.toFixed(1)}h</div>
                    </div>
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl relative overflow-hidden group">
                        <div className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">P50 (Median)</div>
                        <div className="text-xl font-bold text-white">{p50.toFixed(1)}h</div>
                        <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle2 className="w-12 h-12 text-indigo-400" />
                        </div>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="text-[10px] text-amber-300 uppercase tracking-wider mb-1">P85 (Reliable)</div>
                        <div className="text-xl font-bold text-white">{p85.toFixed(1)}h</div>
                    </div>
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="text-[10px] text-red-300 uppercase tracking-wider mb-1">P95 (Chaos)</div>
                        <div className="text-xl font-bold text-white">{p95.toFixed(1)}h</div>
                    </div>
                </div>

                <div className="h-[240px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis
                                type="number"
                                dataKey="x"
                                hide
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickFormatter={(val) => `${val}h`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <ZAxis type="number" range={[60, 60]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#ffffff20' }} />

                            {/* P85 Reference Line */}
                            <ReferenceLine y={p85} stroke="#d97706" strokeDasharray="5 5" strokeOpacity={0.5} label={{ position: 'right', value: 'P85', fill: '#d97706', fontSize: 10 }} />

                            <Scatter name="Tasks" data={chartData}>
                                {chartData.map((entry: { y: number }, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.y > p85 ? '#ef4444' : entry.y > p50 ? '#f59e0b' : '#10b981'}
                                        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex gap-4 p-4 bg-slate-900/40 border border-white/5 rounded-xl">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-200">How to use:</strong> P85 (8.5 hours) represents the reliable time within which 85% of your tasks are completed. Use this for planning future deadlines. Any task taking longer than P95 should be analyzed for blockers.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

