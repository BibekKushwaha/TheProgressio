"use client"
import { useEffect, useMemo, useState } from "react";
import { HabitCard } from "../../../components/habit/Habitcard";
import HabitDialog from "@/components/habit/HabitDialog";
import { useGetHabitsQuery, useUpdateHabitMutation } from "@repo/store";
import { ContributionHeatmap } from "@/components/habit/ContributionHeatmap";
import { UserLevelCard } from "@/components/habit/UserLevelCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/SearchBar";
import { CheckCircle2, Flame, Plus, Shield, Sparkles, Target } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { GlassHero } from "@/components/layout/GlassHero";
import { HeroStatsGrid } from "@/components/layout/HeroStatsGrid";

export default function HabitsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [mercyDays, setMercyDays] = useState(1);
    const [hasInitializedMercy, setHasInitializedMercy] = useState(false);

    const { data, isLoading } = useGetHabitsQuery();
    const [updateHabit, { isLoading: isSavingMercy }] = useUpdateHabitMutation();
    const { toast } = useToast();
    const habits = useMemo(() => data?.habits ?? [], [data]);

    useEffect(() => {
        if (hasInitializedMercy || habits.length === 0) return;
        setMercyDays(habits[0]?.mercyDaysAllowed ?? 1);
        setHasInitializedMercy(true);
    }, [habits, hasInitializedMercy]);

    const filteredHabits = habits.filter((habit) =>
        habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        habit.frequency.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const completedHabitsCount = useMemo(
        () => habits.filter((habit) => habit.streakStatus === "active").length,
        [habits]
    );
    const averageStreak = useMemo(() => {
        if (habits.length === 0) return 0;
        const total = habits.reduce((sum, habit) => sum + habit.currentStreak, 0);
        return Math.round(total / habits.length);
    }, [habits]);

    const habitsNeedingMercyUpdate = useMemo(
        () => habits.filter((habit) => (habit.mercyDaysAllowed ?? 1) !== mercyDays),
        [habits, mercyDays]
    );

    const applyMercyDays = async () => {
        if (habits.length === 0) {
            toast("Create at least one habit before applying mercy days", "error");
            return;
        }

        if (habitsNeedingMercyUpdate.length === 0) {
            toast("Mercy day setting is already applied", "success");
            return;
        }

        try {
            await Promise.all(
                habitsNeedingMercyUpdate.map((habit) =>
                    updateHabit({ id: habit.id, mercyDaysAllowed: mercyDays }).unwrap()
                )
            );
            toast(`Applied ${mercyDays} mercy day setting to ${habitsNeedingMercyUpdate.length} habit(s)`, "success");
        } catch {
            toast("Failed to update mercy day settings", "error");
        }
    };

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
                            <GlassHero
                                className="mb-8 bg-gradient-to-br from-white/[0.06] via-purple-500/[0.08] to-white/[0.02]"
                                topGlowClassName="h-60 w-60 bg-purple-500/20"
                                bottomGlowClassName="-left-16 h-52 w-52 bg-pink-500/10"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300 mb-3">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                                            Habit Performance Hub
                                        </div>
                                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                                            Habit Gallery
                                        </h1>
                                        <p className="text-slate-300/90 max-w-2xl">
                                            Track consistency, protect streaks with mercy days, and build momentum one check-in at a time.
                                        </p>
                                    </div>
                                    <button
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-0.5"
                                        onClick={() => setIsDialogOpen(true)}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Habit
                                    </button>
                                </div>

                                <HeroStatsGrid
                                    className="mt-6 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3"
                                    items={[
                                        {
                                            id: 'total-habits',
                                            label: 'Total Habits',
                                            value: habits.length,
                                            valueClassName: 'text-2xl',
                                        },
                                        {
                                            id: 'completed-today',
                                            label: 'Completed Today',
                                            value: completedHabitsCount,
                                            icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />,
                                            valueClassName: 'text-2xl',
                                        },
                                        {
                                            id: 'avg-streak',
                                            label: 'Avg Streak',
                                            value: averageStreak,
                                            icon: <Target className="w-3.5 h-3.5 text-cyan-300" />,
                                            valueClassName: 'text-2xl',
                                        },
                                    ]}
                                />
                            </GlassHero>

                            <HabitDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

                            {/* Contribution Heatmap */}
                            <div className="mb-8">
                                <ContributionHeatmap />
                            </div>

                            {/* Gamification & Mercy Day Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <UserLevelCard />
                                <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.06] via-amber-500/[0.06] to-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-6">
                                    <div className="absolute -right-14 -top-14 w-40 h-40 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
                                    <div className="flex items-center gap-3 mb-4">
                                        <Shield className="w-5 h-5 text-amber-400" />
                                        <h3 className="text-lg font-bold text-white">Mercy Day Settings</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Mercy days protect your streaks. If you miss a day, a mercy day is used instead of breaking the streak.
                                    </p>
                                    <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-amber-400" />
                                            <span className="text-white font-medium">Mercy Days per Week</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {[0, 1, 2, 3].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setMercyDays(n)}
                                                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all border ${mercyDays === n
                                                            ? 'bg-amber-500 text-white border-amber-300/50 shadow-lg shadow-amber-500/30'
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={applyMercyDays}
                                        disabled={isSavingMercy}
                                        className="mt-4 w-full px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-sm font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-60"
                                    >
                                        {isSavingMercy ? "Saving..." : "Apply to All Habits"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-white">Your Habits</h2>
                                    <p className="text-sm text-slate-400">
                                        Showing {filteredHabits.length} of {habits.length} habit{habits.length === 1 ? "" : "s"}
                                    </p>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10" />
                                    ))}
                                </div>
                            ) : habits.length === 0 ? (
                                <div className="text-center py-20 bg-gradient-to-br from-white/[0.05] to-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                    <h3 className="text-xl font-bold text-slate-300 mb-2">No habits found</h3>
                                    <p className="text-slate-500 mb-6">Start your journey by creating your first habit!</p>
                                    <button
                                        onClick={() => setIsDialogOpen(true)}
                                        className="text-purple-400 font-semibold hover:text-purple-300 transition-colors"
                                    >
                                        + Create New Habit
                                    </button>
                                </div>
                            ) : filteredHabits.length === 0 ? (
                                <div className="text-center py-20 bg-gradient-to-br from-white/[0.05] to-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                    <h3 className="text-xl font-bold text-slate-300 mb-2">No matching habits</h3>
                                    <p className="text-slate-500 mb-2">No habits match &quot;{searchQuery}&quot;.</p>
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="text-purple-400 font-semibold hover:text-purple-300 transition-colors"
                                    >
                                        Clear search
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
