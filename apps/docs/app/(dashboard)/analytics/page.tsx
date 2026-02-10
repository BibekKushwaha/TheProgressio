"use client"
import { useState } from 'react';
import { AnalyticsHeader } from '@/components/analytics/AnalyticHeader';
import { StatCards } from '@/components/analytics/StatCard';
import { FocusTrends } from '@/components/analytics/FocusTrend';
import { SessionBreakdown } from '@/components/analytics/SessionBreakdown';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatMap';
import { DurationPredictionCard } from '@/components/analytics/DurationPredictionCard';
import { ProductivityInsights } from '@/components/analytics/ProductivityInsights';

export default function AnalyticsPage() {
    const [pastDays, setPastDays] = useState("1");

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
            <div className="flex">
                <div className="flex-1 flex flex-col">
                    <AnalyticsHeader pastDays={pastDays} setPastDays={setPastDays} />
                    <main className="flex-1 p-4 md:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto space-y-8">
                            <StatCards pastDays={pastDays} />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <FocusTrends pastDays={pastDays} />
                                </div>
                                <div>
                                    <SessionBreakdown pastDays={pastDays} />
                                </div>
                            </div>
                            <ActivityHeatmap pastDays={pastDays} />

                            {/* Strategic Analytics Section */}
                            <div className="border-t border-white/10 pt-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Strategic Insights</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <DurationPredictionCard />
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-1">
                                        <ProductivityInsights />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}