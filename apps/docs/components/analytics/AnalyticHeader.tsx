// components/analytics/AnalyticsHeader.tsx
"use client"
import { Calendar, Download } from 'lucide-react';
import { FilterDropdown } from '../planner/FilterDropdown';

interface AnalyticsHeaderProps {
    pastDays: string;
    setPastDays: (value: string) => void;
}

export function AnalyticsHeader({ pastDays, setPastDays }: AnalyticsHeaderProps) {
    const PAST_DAYS_OPTIONS = [
        { label: "Daily", value: "1" },
        { label: "Weekly", value: "7" },
    ] as const;
    return (
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            Analytics Overview
                        </h1>
                        <p className="text-slate-400">Track your productivity trends and study habits.</p>
                    </div>

                    <div className="flex gap-3">
                        <FilterDropdown
                            value={pastDays}
                            options={PAST_DAYS_OPTIONS}
                            onChange={setPastDays}
                            icon={<Calendar className="w-4 h-4" />}
                            placeholder={'Select'}
                        />
                        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:-translate-y-0.5">
                            <Download className="w-4 h-4" />
                            <span>Export Report</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}