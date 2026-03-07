"use client";

import React, { useState, useMemo, useId } from 'react';
import { useGetWeeklyTrendsQuery, useGetProfileQuery } from '@repo/store';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function WeeklyActivity() {
    const [viewType, setViewType] = useState<'week' | 'month'>('week');
    const gradientAreaId = useId().replace(/:/g, '');
    const gradientLineId = useId().replace(/:/g, '');
    const { data: profileData } = useGetProfileQuery();
    const { data: trendsData, isLoading } = useGetWeeklyTrendsQuery(undefined);
    const periodOptions = [
        { value: 'week' as const, label: 'Week' },
        { value: 'month' as const, label: 'Month' },
    ];

    const dailyLimit = profileData?.user?.dailyGoalHours || 4;
    const yAxisLabels = [
        `${dailyLimit}h`,
        `${Math.round(dailyLimit * 0.75)}h`,
        `${Math.round(dailyLimit * 0.5)}h`,
        `${Math.round(dailyLimit * 0.25)}h`,
        '0h'
    ];

    const rawData = trendsData?.data || [];
    const filteredData = viewType === 'week' ? rawData.slice(-7) : rawData.slice(-30);

    // Map dates to short day names
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = useMemo(() => filteredData.map(d => {
        const date = new Date(d.date);
        return {
            ...d,
            day: days[date.getDay()],
            // Calculate percentage based on user's daily goal for visualization
            percentage: Math.min(100, Math.round((d.hours / dailyLimit) * 100))
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [filteredData, dailyLimit]);

    // Generate SVG path for the line and gradient area — must be declared before
    // any early returns so React Hooks are called unconditionally.
    const chartWidth = 600;
    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
    const { areaPath, linePath } = useMemo(() => {
        if (data.length === 0) return { areaPath: '', linePath: '' };
        const pts = data.map((d, i) => `${i * step} ${256 - (d.percentage * 2)}`).join(' L ');
        return {
            areaPath: `M 0 256 L ${pts} L ${chartWidth} 256 Z`,
            linePath: `M ${pts}`,
        };
    }, [data, step]);

    if (isLoading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                {/* Header row */}
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-40 bg-white/5" />
                        <Skeleton className="h-4 w-56 bg-white/5" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-xl bg-white/5" />
                </div>
                {/* Fake bar chart — 7 bars of varying heights to mimic the area chart */}
                <div className="flex items-end gap-3 h-48 px-2">
                    {[55, 80, 40, 95, 60, 75, 50].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <Skeleton
                                className="w-full rounded-t-md bg-white/5"
                                style={{ height: `${h}%` }}
                            />
                            <Skeleton className="h-3 w-6 bg-white/[0.03]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Weekly Activity</h2>
                <p className="text-sm text-slate-400 mb-6">No study sessions logged yet. Complete your first focus session to see your chart.</p>
                {/* Ghost chart — gives an impression of what they’ll see */}
                <div className="flex items-end gap-3 h-32 opacity-20">
                    {[30, 50, 20, 80, 45, 60, 35].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-md" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 relative overflow-hidden group/container">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full group-hover/container:bg-purple-500/10 transition-all duration-1000"></div>

            <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {viewType === 'week' ? 'Weekly' : 'Monthly'} Activity
                        <Sparkles className="w-4 h-4 text-purple-400 opacity-50" />
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {viewType === 'week' ? 'Consistency check over last 7 days' : 'Consistency check over last 30 days'}
                    </p>
                </div>
                <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                    {periodOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setViewType(option.value)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === option.value
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'text-slate-500 hover:text-white'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative h-64 mb-8 group pl-8">
                {/* Y-Axis Goal Line */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-bold text-slate-600 pr-2 pointer-events-none">
                    {yAxisLabels.map((label) => (
                        <span key={label} className={label === '0h' ? 'opacity-0' : undefined}>{label}</span>
                    ))}
                </div>

                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-5 pointer-events-none">
                    {yAxisLabels.map((label) => <div key={label} className="border-t border-white w-full h-0"></div>)}
                </div>

                <svg
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                    viewBox="0 0 600 256"
                    role="img"
                    aria-label={`${viewType === 'week' ? 'Weekly' : 'Monthly'} activity chart — hours studied per day`}
                >
                    <defs>
                        <linearGradient id={gradientAreaId} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id={gradientLineId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                            <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                        </linearGradient>
                    </defs>

                    {/* Background Area Gradient */}
                    <path
                        d={areaPath}
                        fill={`url(#${gradientAreaId})`}
                        className="transition-all duration-700 ease-out animate-in fade-in slide-in-from-bottom-4"
                    />

                    {/* Top Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={`url(#${gradientLineId})`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-in fade-in duration-1000"
                    />

                    {/* Interaction Points */}
                    {data.map((point, index) => (
                        <g key={point.date} className="cursor-pointer group/point">
                            <circle
                                cx={index * step}
                                cy={256 - (point.percentage * 2)}
                                r="10"
                                fill="rgb(168, 85, 247)"
                                className="opacity-0 group-hover/point:opacity-20 transition-all duration-300"
                            />
                            <circle
                                cx={index * step}
                                cy={256 - (point.percentage * 2)}
                                r="4"
                                fill="white"
                                className="transition-transform duration-300 group-hover/point:scale-150"
                            />
                            <circle
                                cx={index * step}
                                cy={256 - (point.percentage * 2)}
                                r="2"
                                fill="rgb(168, 85, 247)"
                                className="group-hover/point:opacity-0 transition-opacity"
                            />

                            {/* Enhanced tooltip with day + hours + date */}
                            <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <rect
                                    x={Math.max(0, Math.min(index * step - 45, chartWidth - 90))}
                                    y={256 - (point.percentage * 2) - 55}
                                    width="90"
                                    height="40"
                                    rx="8"
                                    fill="rgb(15, 23, 42)"
                                    fillOpacity="0.95"
                                    stroke="rgba(168, 85, 247, 0.3)"
                                    strokeWidth="1"
                                />
                                <text
                                    x={Math.max(45, Math.min(index * step, chartWidth - 45))}
                                    y={256 - (point.percentage * 2) - 37}
                                    textAnchor="middle"
                                    fill="white"
                                    className="text-[11px] font-black"
                                >
                                    {point.day} • {point.hours}h
                                </text>
                                <text
                                    x={Math.max(45, Math.min(index * step, chartWidth - 45))}
                                    y={256 - (point.percentage * 2) - 23}
                                    textAnchor="middle"
                                    fill="rgb(148, 163, 184)"
                                    className="text-[9px]"
                                >
                                    {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </text>
                            </g>
                        </g>
                    ))}
                </svg>
            </div>

            <div className="flex justify-between px-2 pl-8 border-t border-white/5">
                {data.map((point) => (
                    <div key={point.date} className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{point.day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
