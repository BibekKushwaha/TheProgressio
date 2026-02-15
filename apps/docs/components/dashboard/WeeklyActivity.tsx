"use client";

import React, { useState } from 'react';
import { useGetWeeklyTrendsQuery } from '@repo/store';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function WeeklyActivity() {
    const [viewType, setViewType] = useState<'week' | 'month'>('week');
    const { data: trendsData, isLoading } = useGetWeeklyTrendsQuery();
    const periodOptions = [
        { value: 'week' as const, label: 'Week' },
        { value: 'month' as const, label: 'Month' },
    ];
    const yAxisLabels = ['4h', '3h', '2h', '1h', '0h'];

    const rawData = trendsData?.data || [];
    const filteredData = viewType === 'week' ? rawData.slice(-7) : rawData.slice(-30);

    // Map dates to short day names
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = filteredData.map(d => {
        const date = new Date(d.date);
        return {
            ...d,
            day: days[date.getDay()],
            // Calculate percentage based on a 4-hour max for visualization
            // Using 4 as it matches standard daily goal in the app
            percentage: Math.min(100, Math.round((d.hours / 4) * 100))
        };
    });

    if (isLoading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-[400px]">
                <Skeleton className="h-10 w-1/3 mb-10 bg-white/5" />
                <Skeleton className="h-64 w-full bg-white/5" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Weekly Activity</h2>
                <p className="text-sm text-slate-400">No activity data yet.</p>
            </div>
        );
    }

    // Generate SVG path for the line and gradient area
    const chartWidth = 600;
    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
    const points = data.map((d, i) => `${i * step} ${256 - (d.percentage * 2)}`).join(' L ');
    const areaPath = `M 0 256 L ${points} L ${chartWidth} 256 Z`;
    const linePath = `M ${points}`;

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
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                viewType === option.value
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

                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 256">
                    <defs>
                        <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="activityLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                            <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                        </linearGradient>
                    </defs>

                    {/* Background Area Gradient */}
                    <path
                        d={areaPath}
                        fill="url(#activityGradient)"
                        className="transition-all duration-700 ease-out animate-in fade-in slide-in-from-bottom-4"
                    />

                    {/* Top Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke="url(#activityLine)"
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

                            {/* Simple tooltip simulation using SVG text - more reliable in standard SVG */}
                            <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-300">
                                <rect
                                    x={index * step - 30}
                                    y={256 - (point.percentage * 2) - 45}
                                    width="60"
                                    height="30"
                                    rx="6"
                                    fill="black"
                                    fillOpacity="0.8"
                                    className="backdrop-blur-md"
                                />
                                <text
                                    x={index * step}
                                    y={256 - (point.percentage * 2) - 25}
                                    textAnchor="middle"
                                    fill="white"
                                    className="text-[10px] font-black"
                                >
                                    {point.hours}h
                                </text>
                            </g>
                        </g>
                    ))}
                </svg>
            </div>

            <div className="flex justify-between px-2 pl-8 border-t border-white/5 pt-6">
                {data.map((point) => (
                    <div key={point.date} className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{point.day}</span>
                        <div className={`w-1 h-1 rounded-full mb-1 ${point.hours > 0 ? 'bg-purple-500' : 'bg-slate-800'}`}></div>
                        <span className={`text-xs font-bold ${point.hours > 0 ? 'text-white' : 'text-slate-600'}`}>
                            {point.hours}h
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
