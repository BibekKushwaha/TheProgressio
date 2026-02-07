import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Habit, useLogHabitMutation } from '@repo/store';
import { HabitActionMenu } from './HabitActionMenu';

export function HabitCard({ habit }: { habit: Habit }) {
    // Determine the color theme. If the habit has an RTK-saved color (gradient), use it.
    // Otherwise fallback to a default purple gradient.
    const colorTheme = habit.color || "from-purple-600 to-pink-600";

    const [logHabit, { isLoading }] = useLogHabitMutation();

    const handleCheckIn = async () => {
        try {
            await logHabit({ id: habit.id, completedValue: 1 }).unwrap();
        } catch (error) {
            console.error("Failed to check in habit:", error);
        }
    };

    return (
        <div className="group relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300">
            {/* Background glow using the habit's color */}
            <div className={cn(
                "absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br",
                colorTheme
            )} />

            <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                {(habit as any).newTrophy && (
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        <span>New Trophy</span>
                    </div>
                )}
                <HabitActionMenu habit={habit} />
            </div>

            <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="text-4xl w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    {habit.icon || "✨"}
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 line-clamp-1">{habit.name.charAt(0).toUpperCase() + habit.name.slice(1)}</h3>
                    <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        {habit.frequency}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Flame className={cn("w-5 h-5", habit.currentStreak > 0 ? "text-orange-500" : "text-slate-500")} />
                    <span className="text-2xl font-bold">{habit.currentStreak}</span>
                    <span className="text-sm text-slate-400">streak</span>
                </div>
                <div className="flex-1 text-right">
                    <div className={cn("text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", colorTheme)}>
                        {habit.targetValue}
                    </div>
                    <div className="text-xs text-slate-400">target</div>
                </div>
            </div>

            {/* Simple progress placeholder */}
            <div className="mb-4 h-1 items-end gap-0.5 flex bg-white/5 rounded-full overflow-hidden">
                <div
                    className={cn("h-full bg-gradient-to-r transition-all duration-500", colorTheme)}
                    style={{ width: `${Math.min((habit.currentStreak / habit.targetValue) * 100, 100)}%` }}
                />
            </div>

            <button
                className={cn(
                    "w-full py-3 rounded-xl font-bold transition-all duration-300 relative z-10",
                    habit.streakStatus === 'active'
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400 cursor-not-allowed'
                        : cn("bg-gradient-to-r hover:shadow-lg hover:-translate-y-0.5", colorTheme)
                )}
                onClick={handleCheckIn}
                disabled={habit.streakStatus === 'active' || isLoading}
            >
                {isLoading ? 'Checking in...' : (habit.streakStatus === 'active' ? '✓ Completed' : 'Check-in')}
            </button>
        </div>
    );
}