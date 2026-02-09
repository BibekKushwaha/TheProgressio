// components/schedule/CalendarHeader.tsx
'use client';

import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useState } from 'react';

const views = ['Day', 'Month'];

export function CalendarHeader({ selectedView, setSelectedView }: { selectedView: string; setSelectedView: (view: string) => void }) {

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{
                        selectedView === 'Day' ? 'Day' : selectedView === 'Week' ? 'Week' : 'Month'
                    } </h1>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">Synced</span>
                    </div>
                </div>
                <p className="text-slate-400 text-lg">{new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    year: 'numeric'
                })}</p>
            </div>

            <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                    Today
                </button>

                <div className="flex items-center gap-2">
                    <button
                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300"
                        aria-label="Next month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                    {views.map((view) => (
                        <button
                            key={view}
                            onClick={() => setSelectedView(view)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${selectedView === view
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg'
                                : 'hover:bg-white/5'
                                }`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}