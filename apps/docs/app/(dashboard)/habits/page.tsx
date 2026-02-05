"use client";

import React from "react";
import { Plus, Flame, Check, X, Trophy } from "lucide-react";
import GlassCard from "../../components/ui/glass-card";
import GradientButton from "../../components/ui/gradient-button";
import PageHeader from "../../components/ui/page-header";
import { cn } from "../../../lib/utils";

// Mock Data
const HABITS = [
    { id: 1, name: "Morning Reading", frequency: "Daily", streak: 12, completedToday: true, history: [1, 1, 1, 1, 0, 1, 1] },
    { id: 2, name: "Drink Water 3L", frequency: "Daily", streak: 5, completedToday: false, history: [1, 1, 0, 1, 1, 1, 0] },
    { id: 3, name: "Gym Workout", frequency: "Weekly", streak: 3, completedToday: false, history: [0, 1, 0, 1, 0, 0, 0] },
    { id: 4, name: "Deep Work Session", frequency: "Daily", streak: 21, completedToday: true, history: [1, 1, 1, 1, 1, 1, 1] },
    { id: 5, name: "Review Goals", frequency: "Weekly", streak: 0, completedToday: false, history: [0, 0, 0, 0, 0, 0, 0] },
];

const HabitsPage = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader title="My Habits" description="Build consistency, one day at a time">
                <GradientButton>
                    <Plus className="w-4 h-4 mr-2" />
                    New Habit
                </GradientButton>
            </PageHeader>

            {/* Streak Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {HABITS.map((habit) => (
                    <GlassCard key={habit.id} className="p-6 relative group overflow-hidden hover:scale-[1.02] transition-transform duration-300" gradient={habit.completedToday}>
                        {/* Optional Celebration Effect */}
                        {habit.streak > 10 && habit.completedToday && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full text-[10px] border border-yellow-500/20">
                                <Trophy className="w-3 h-3" />
                                On Fire!
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">{habit.name}</h3>
                                <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    {habit.frequency}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className={cn(
                                    "text-2xl font-black flex items-center gap-1",
                                    habit.isActive ? "text-orange-400" : "text-gray-400"
                                )}>
                                    <Flame className={cn("w-6 h-6", habit.streak > 0 ? "fill-orange-500 text-orange-600" : "text-gray-600")} />
                                    {habit.streak}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Streak</span>
                            </div>
                        </div>

                        {/* Sparkline (Fake) */}
                        <div className="flex items-end gap-1 h-8 mb-6 opacity-50">
                            {habit.history.map((val, i) => (
                                <div key={i} className={cn(
                                    "flex-1 rounded-sm transition-all hover:opacity-100",
                                    val ? "bg-green-500 h-full" : "bg-white/10 h-1/3"
                                )} />
                            ))}
                        </div>

                        <button
                            className={cn(
                                "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300",
                                habit.completedToday
                                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20 cursor-default"
                                    : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10"
                            )}
                        >
                            {habit.completedToday ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Completed
                                </>
                            ) : (
                                "Check In"
                            )}
                        </button>
                    </GlassCard>
                ))}

                {/* Add New Card Stub */}
                <button className="h-full min-h-[250px] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-indigo-500/50 hover:bg-white/5 transition-all gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-medium">Create New Habit</span>
                </button>
            </div>
        </div>
    );
};

export default HabitsPage;
