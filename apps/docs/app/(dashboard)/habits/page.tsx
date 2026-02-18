"use client"
import { useMemo, useState } from "react";
import { HabitCard } from "../../../components/habit/HabitCard";
import HabitDialog from "../../../components/habit/HabitDialog";
import { useGetHabitsQuery } from "@repo/store";
import { ContributionHeatmap } from "../../../components/habit/ContributionHeatmap";
import { UserLevelCard } from "../../../components/habit/UserLevelCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/SearchBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function HabitsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const highlightedHabitId = searchParams.get('habitId') || '';
    const [focusedHabitId, setFocusedHabitId] = useState('');
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data, isLoading } = useGetHabitsQuery();
    const habits = useMemo(() => data?.habits || [], [data?.habits]);

    const filteredHabits = habits.filter((habit) =>
        habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        habit.frequency.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (highlightedHabitId) {
            setFocusedHabitId(highlightedHabitId);
        }
    }, [highlightedHabitId]);

    useEffect(() => {
        if (!focusedHabitId) return;

        const scrollToTarget = () => {
            const element = document.getElementById(`habit-card-${focusedHabitId}`);
            if (!element) return;
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (highlightedHabitId) {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('habitId');
                const next = params.toString();
                router.replace(next ? `${pathname}?${next}` : pathname);
            }
        };

        const timeoutId = window.setTimeout(scrollToTarget, 120);
        return () => window.clearTimeout(timeoutId);
    }, [focusedHabitId, highlightedHabitId, habits.length, pathname, router, searchParams]);

    return (
        <div className="space-y-6">
            <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
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

            <HabitDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
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
                        <div key={habit.id} id={`habit-card-${habit.id}`}>
                            <HabitCard habit={habit} highlighted={habit.id === focusedHabitId} />
                        </div>
                    ))}
                </div>
            )}


            {/* Gamification & Mercy Day Row */}
            <div className="mt-10 mb-8">
                <UserLevelCard />
            </div>


            {/* Contribution Heatmap */}
            <div className="mb-8">
                <ContributionHeatmap />
            </div>
        </div>
    );
}