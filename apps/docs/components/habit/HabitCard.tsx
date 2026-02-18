import { Flame, Shield, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Habit, useLogHabitMutation, useUpdateHabitMutation } from '@repo/store';
import { HabitActionMenu } from './HabitActionMenu';
import { useToast } from '@/components/ui/toast-provider';
import { useEffect, useState } from 'react';

export function HabitCard({ habit, highlighted = false }: { habit: Habit; highlighted?: boolean }) {
    const hasNewTrophy = Boolean((habit as { newTrophy?: boolean }).newTrophy);
    // Determine the color theme. If the habit has an RTK-saved color (gradient), use it.
    // Otherwise fallback to a default purple gradient.
    const colorTheme = habit.color || "from-purple-600 to-pink-600";

    const [logHabit, { isLoading }] = useLogHabitMutation();
    const [updateHabit, { isLoading: isUpdatingMercy }] = useUpdateHabitMutation();
    const { toast } = useToast();
    const [mercyDays, setMercyDays] = useState(habit.mercyDaysAllowed ?? 1);

    useEffect(() => {
        setMercyDays(habit.mercyDaysAllowed ?? 1);
    }, [habit.id, habit.mercyDaysAllowed]);

    const handleCheckIn = async () => {
        try {
            await logHabit({ id: habit.id, completedValue: 1 }).unwrap();

            // Show success toast
            toast('✅ Habit logged successfully!', 'success');
        } catch (error) {
            console.error("Failed to check in habit:", error);
            toast('Failed to check in habit', 'error');
        }
    };

    const handleSaveMercyDays = async () => {
        if (mercyDays === (habit.mercyDaysAllowed ?? 1)) {
            toast('No changes to save', 'info');
            return;
        }

        try {
            await updateHabit({ id: habit.id, mercyDaysAllowed: mercyDays }).unwrap();
            toast('✅ Mercy days updated', 'success');
        } catch (error) {
            console.error('Failed to update mercy days:', error);
            toast('Failed to update mercy days', 'error');
        }
    };

    return (
        <div className={cn(
            "group relative overflow-hidden bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300",
            highlighted && 'ring-2 ring-purple-400/70 shadow-[0_0_0_1px_rgba(168,85,247,0.45)] pulse-once'
        )}>
            {/* Background glow using the habit's color */}
            <div className={cn(
                "absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br",
                colorTheme
            )} />

            <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                {hasNewTrophy && (
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

            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 relative z-10">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Mercy Days
                </div>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setMercyDays(value)}
                                aria-pressed={mercyDays === value}
                                className={cn(
                                    'h-8 w-8 rounded-md text-xs font-bold transition-all',
                                    mercyDays === value
                                        ? 'bg-amber-500 text-white shadow shadow-amber-500/30'
                                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                )}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveMercyDays}
                        disabled={isUpdatingMercy || mercyDays === (habit.mercyDaysAllowed ?? 1)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-400 text-black disabled:opacity-50"
                    >
                        {isUpdatingMercy ? 'Saving...' : 'Save'}
                    </button>
                </div>
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