"use client"
import { useState } from "react";
import { HabitCard } from "../../../components/habit/Habitcard";
import HabitDialog from "@/components/habit/HabitDialog";
import { useGetHabitsQuery } from "@repo/store";
import { ContributionHeatmap } from "@/components/habit/ContributionHeatmap";
import { UserLevelCard } from "@/components/habit/UserLevelCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/SearchBar";
import { Shield, Flame } from "lucide-react";

export default function HabitsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [mercyDays, setMercyDays] = useState(1);

    const { data, isLoading } = useGetHabitsQuery();
    const habits = data?.habits || [];

    const filteredHabits = habits.filter((habit) =>
        habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        habit.frequency.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
            <div className="flex">
                <div className="flex-1 flex flex-col">
                    <SearchBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />
                    <main className="flex-1 p-4 md:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                        Habit Gallery
                                    </h1>
                                    <p className="text-slate-400">Keep up the streak! You&apos;re doing great.</p>
                                </div>
                                <button
                                    className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5"
                                    onClick={() => setIsDialogOpen(true)}
                                >
                                    + Add Habit
                                </button>
                            </div>

                            <HabitDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

                            {/* Contribution Heatmap */}
                            <div className="mb-8">
                                <ContributionHeatmap />
                            </div>

                            {/* Gamification & Mercy Day Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <UserLevelCard />
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Shield className="w-5 h-5 text-amber-400" />
                                        <h3 className="text-lg font-bold text-white">Mercy Day Settings</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Mercy days protect your streaks. If you miss a day, a mercy day is used instead of breaking the streak.
                                    </p>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-amber-400" />
                                            <span className="text-white font-medium">Mercy Days per Week</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {[0, 1, 2, 3].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setMercyDays(n)}
                                                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${mercyDays === n
                                                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10" />
                                    ))}
                                </div>
                            ) : habits.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <h3 className="text-xl font-bold text-slate-300 mb-2">No habits found</h3>
                                    <p className="text-slate-500 mb-6">Start your journey by creating your first habit!</p>
                                    <button
                                        onClick={() => setIsDialogOpen(true)}
                                        className="text-purple-400 font-semibold hover:text-purple-300 transition-colors"
                                    >
                                        + Create New Habit
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredHabits.map((habit) => (
                                        <HabitCard key={habit.id} habit={habit} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}