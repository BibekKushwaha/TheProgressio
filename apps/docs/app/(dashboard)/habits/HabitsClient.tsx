"use client";

import { useMemo, useState, useEffect, Profiler, type ProfilerOnRenderCallback } from "react";
import { useNetworkWaterfall } from "@/hooks/useNetworkWaterfall";
import { HabitCard } from "@/components/habit/HabitCard";
import HabitDialog from "@/components/habit/HabitDialog";
import { useGetHabitsQuery, type Habit } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/SearchBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function HabitsClient({
    serverHabits,
    serverHabitsLoading = false,
}: {
    /** Habit list pre-fetched by the parent bootstrap coordinator.
     *  When provided, the individual getHabits RTK query is skipped.
     *  Mutations invalidate the bootstrap cache → coordinator refetches
     *  and passes updated serverHabits here. */
    serverHabits?: Habit[];
    serverHabitsLoading?: boolean;
} = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const highlightedHabitId = searchParams.get("habitId") || "";
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useNetworkWaterfall('HabitsPage');

    // DEV-ONLY: warn when HabitCard memo stops working (actual > 15 % of base cost)
    const onRenderCallback: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
        if (process.env.NODE_ENV !== 'development') return;
        if (phase === 'update' && baseDuration > 0 && actualDuration > baseDuration * 0.15) {
            console.warn(
                `[Profiler] ${id} re-rendered ${Math.round((actualDuration / baseDuration) * 100)}% of base cost — verify React.memo`,
                { phase, actual: Math.round(actualDuration), base: Math.round(baseDuration) }
            );
        } else {
            console.debug(
                `[Profiler] ${id} (${phase}) actual=${Math.round(actualDuration)} ms  base=${Math.round(baseDuration)} ms`
            );
        }
    };

    // Skip when parent coordinator already fetched via bootstrap.
    const { data, isLoading: habitsLoading } = useGetHabitsQuery(
        undefined,
        { skip: serverHabits !== undefined }
    );
    const habits = useMemo(
        () => serverHabits ?? data?.habits ?? [],
        [serverHabits, data?.habits]
    );
    const isLoading = serverHabits !== undefined ? serverHabitsLoading : habitsLoading;

    const filteredHabits = useMemo(
        () =>
            habits.filter(
                (habit) =>
                    habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    habit.frequency.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        [habits, searchQuery]
    );

    // Scroll to a highlighted habit (from notification deep-link) and clean the URL
    useEffect(() => {
        if (!highlightedHabitId) return;

        const id = window.setTimeout(() => {
            document
                .getElementById(`habit-card-${highlightedHabitId}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });

            const params = new URLSearchParams(searchParams.toString());
            params.delete("habitId");
            router.replace(params.size ? `${pathname}?${params}` : pathname);
        }, 120);

        return () => window.clearTimeout(id);
    }, [highlightedHabitId, pathname, router, searchParams]);

    return (
        <div className="space-y-6">
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

            <PageHeader
                title="Habit Gallery"
                subtitle="Keep up the streak! You're doing great."
            >
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/25 h-12 px-6 rounded-xl font-bold"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Habit
                </Button>
            </PageHeader>

            {isDialogOpen && (
                <HabitDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton
                            key={i}
                            className="h-64 rounded-2xl bg-white/5 border border-white/10"
                        />
                    ))}
                </div>
            ) : habits.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No habits found</h3>
                    <p className="text-slate-500 mb-6">
                        Start your journey by creating your first habit!
                    </p>
                    <Button
                        variant="ghost"
                        onClick={() => setIsDialogOpen(true)}
                        className="text-purple-400 font-semibold hover:text-purple-300"
                    >
                        + Create New Habit
                    </Button>
                </div>
            ) : (
                <Profiler id="HabitGrid" onRender={onRenderCallback}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredHabits.map((habit) => (
                            <div key={habit.id} id={`habit-card-${habit.id}`}>
                                <HabitCard
                                    habit={habit}
                                    highlighted={habit.id === highlightedHabitId}
                                />
                            </div>
                        ))}
                    </div>
                </Profiler>
            )}
        </div>
    );
}
