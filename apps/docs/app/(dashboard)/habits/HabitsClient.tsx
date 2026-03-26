"use client";

import { useMemo, useState, useEffect, Profiler, type ProfilerOnRenderCallback } from "react";
import { useNetworkWaterfall } from "@/hooks/useNetworkWaterfall";
import { HabitCard } from "@/components/habit/HabitCard";
import HabitDialog from "@/components/habit/HabitDialog";
import { HabitQuickCreate } from "@/components/habit/HabitQuickCreate";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetHabitsQuery, type Habit } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Flame, CheckCircle2 } from "lucide-react";
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);

    useNetworkWaterfall('HabitsPage');

    // DEV-ONLY: warn when HabitCard memo stops working (actual > 15 % of base cost)
    const onRenderCallback: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
        if (process.env.NODE_ENV !== 'development') return;
        if (phase === 'update' && baseDuration > 0 && actualDuration > baseDuration * 0.15) {
            console.warn(
                `[Profiler] ${id} re-rendered ${Math.round((actualDuration / baseDuration) * 100)}% of base cost — verify React.memo`,
                { phase, actual: Math.round(actualDuration), base: Math.round(baseDuration) }
            );
        }
        // No debug logging on the happy path — it creates noise in DevTools during normal renders.
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

    const openManualCreate = () => {
        setIsDialogOpen(true);
    };

    const openAICreate = () => {
        setShowQuickCreate(true);
    };

    return (
        <div className="space-y-6">

            <PageHeader
                title="Habit Tracker"
                subtitle="Build small daily systems that support your study goals."
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/25 h-12 px-6 rounded-xl font-bold">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Habit
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 border-white/10 bg-slate-900 text-slate-200">
                        <DropdownMenuItem
                            onSelect={openAICreate}
                            className="cursor-pointer focus:bg-white/10 focus:text-white"
                        >
                            <div className="flex flex-col gap-0.5 py-1">
                                <span className="text-sm font-semibold">AI Create</span>
                                <span className="text-xs text-slate-400">Describe it once and preview before saving</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={openManualCreate}
                            className="cursor-pointer focus:bg-white/10 focus:text-white"
                        >
                            <div className="flex flex-col gap-0.5 py-1">
                                <span className="text-sm font-semibold">Manual Create</span>
                                <span className="text-xs text-slate-400">Fill in every habit detail yourself</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </PageHeader>

            {showQuickCreate && <HabitQuickCreate />}

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
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                        <Flame className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-slate-200">No habits yet</h3>
                    <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-400">
                        Start with one tiny academic habit — like 20 minutes of revision, one mock question set, or a daily recap — and let streaks build the momentum.
                    </p>
                    <div className="mx-auto mb-6 grid max-w-2xl grid-cols-1 gap-3 text-left md:grid-cols-3">
                        {[
                            'Track consistency over time',
                            'Protect streaks during busy weeks',
                            'See habits appear in your analytics',
                        ].map((benefit) => (
                            <div key={benefit} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                <span>{benefit}</span>
                            </div>
                        ))}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="btn-primary">
                                <Plus className="mr-2 h-4 w-4" />
                                Create your first habit
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-64 border-white/10 bg-slate-900 text-slate-200">
                            <DropdownMenuItem
                                onSelect={openAICreate}
                                className="cursor-pointer focus:bg-white/10 focus:text-white"
                            >
                                <div className="flex flex-col gap-0.5 py-1">
                                    <span className="text-sm font-semibold">AI Create</span>
                                    <span className="text-xs text-slate-400">Describe it once and preview before saving</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={openManualCreate}
                                className="cursor-pointer focus:bg-white/10 focus:text-white"
                            >
                                <div className="flex flex-col gap-0.5 py-1">
                                    <span className="text-sm font-semibold">Manual Create</span>
                                    <span className="text-xs text-slate-400">Fill in every habit detail yourself</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ) : process.env.NODE_ENV === 'development' ? (
                // Profiler is dev-only: React.Profiler still adds overhead even when the
                // callback is a no-op, so we dead-code-eliminate it in production builds.
                <Profiler id="HabitGrid" onRender={onRenderCallback}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {habits.map((habit) => (
                            <div key={habit.id} id={`habit-card-${habit.id}`}>
                                <HabitCard
                                    habit={habit}
                                    highlighted={habit.id === highlightedHabitId}
                                />
                            </div>
                        ))}
                    </div>
                </Profiler>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {habits.map((habit) => (
                        <div key={habit.id} id={`habit-card-${habit.id}`}>
                            <HabitCard
                                habit={habit}
                                highlighted={habit.id === highlightedHabitId}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
