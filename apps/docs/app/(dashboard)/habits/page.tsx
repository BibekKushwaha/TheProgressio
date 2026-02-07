"use client"
import { useState } from "react";
import { HabitCard } from "../../../components/habit/Habitcard";
import { Header } from "../../../components/habit/Header";
import HabitDialog from "@/components/habit/HabitDialog";
import { useGetHabitsQuery } from "@repo/store";


export default function HabitsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
                    <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    <main className="flex-1 p-4 md:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                        My Habits
                                    </h1>
                                    <p className="text-slate-400">Keep up the streak! You're doing great.</p>
                                </div>
                                <button
                                    className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5"
                                    onClick={() => setIsDialogOpen(true)}
                                >
                                    + Add Habit
                                </button>
                            </div>

                            <HabitDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-64 bg-white/5 rounded-2xl border border-white/10" />
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