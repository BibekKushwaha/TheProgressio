// components/dashboard/HabitStreaks.tsx
import { Plus } from 'lucide-react';

const habits = [
    { id: 1, name: 'Morning Meditation', progress: 80, current: 4, total: 5 },
    { id: 2, name: 'Reading', progress: 60, current: 3, total: 5 },
    { id: 3, name: 'Exercise', progress: 100, current: 5, total: 5 },
    { id: 4, name: 'Journaling', progress: 40, current: 2, total: 5 },
];

export function HabitStreaks() {
    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Habit Streaks</h2>

            <div className="space-y-4 mb-6">
                {habits.map((habit) => (
                    <div key={habit.id}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{habit.name}</span>
                            <span className="text-sm text-slate-400">
                                {habit.current}/{habit.total} days
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                style={{ width: `${habit.progress}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                <Plus className="w-5 h-5" />
                Add New Habit
            </button>
        </div>
    );
}