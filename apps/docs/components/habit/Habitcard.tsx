import { CheckCircle2, Flame, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Habit, useLogHabitMutation } from '@repo/store';
import { HabitActionMenu } from './HabitActionMenu';
import { useToast } from '@/components/ui/toast-provider';
import { useState } from 'react';
import {
    apiErrorMessageIncludes,
    getApiErrorMessage,
    getApiErrorStatus,
} from '@/lib/api-error';

export function HabitCard({ habit }: { habit: Habit }) {
    const colorTheme = habit.color || "from-purple-600 to-pink-600";
    const progressPercent = Math.min((habit.currentStreak / Math.max(habit.targetValue, 1)) * 100, 100);
    const [markedCompleteLocally, setMarkedCompleteLocally] = useState(false);
    const isCompleted = habit.streakStatus === 'active' || markedCompleteLocally;

    const [logHabit, { isLoading }] = useLogHabitMutation();
    const { toast } = useToast();
    const habitWithBadge = habit as Habit & { newTrophy?: boolean };

    const handleCheckIn = async () => {
        try {
            const result = await logHabit({ id: habit.id, completedValue: 1 }).unwrap();

            if (result.alreadyLogged) {
                setMarkedCompleteLocally(true);
                toast('Already checked in for this period', 'info');
                return;
            }

            // Show success toast
            setMarkedCompleteLocally(true);
            toast('✅ Habit logged successfully!', 'success');
        } catch (error: unknown) {
            const status = getApiErrorStatus(error);

            // Backward compatibility: some backend builds return 400 for "already logged".
            if (status === 400 && apiErrorMessageIncludes(error, 'already logged')) {
                setMarkedCompleteLocally(true);
                toast('Already checked in for this period', 'info');
                return;
            }

            // Compatibility fallback for strict backends that reject explicit payload shape.
            if (status === 400) {
                try {
                    const fallbackResult = await logHabit({ id: habit.id }).unwrap();
                    if (fallbackResult.alreadyLogged) {
                        setMarkedCompleteLocally(true);
                        toast('Already checked in for this period', 'info');
                        return;
                    }
                    setMarkedCompleteLocally(true);
                    toast('✅ Habit logged successfully!', 'success');
                    return;
                } catch (retryError: unknown) {
                    if (
                        getApiErrorStatus(retryError) === 400 &&
                        apiErrorMessageIncludes(retryError, 'already logged')
                    ) {
                        setMarkedCompleteLocally(true);
                        toast('Already checked in for this period', 'info');
                        return;
                    }
                    console.error('Habit check-in retry failed:', {
                        habitId: habit.id,
                        status: getApiErrorStatus(retryError),
                        error: retryError,
                    });
                    toast(getApiErrorMessage(retryError, 'Failed to check in habit'), 'error');
                    return;
                }
            }

            console.error('Failed to check in habit:', {
                habitId: habit.id,
                status,
                error,
            });
            toast(getApiErrorMessage(error, 'Failed to check in habit'), 'error');
        }
    };

    return (
        <div className="group relative overflow-hidden bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className={cn(
                "absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity bg-gradient-to-br",
                colorTheme
            )} />
            <div className="absolute -left-16 -bottom-16 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

            <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                {habitWithBadge.newTrophy && (
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        <span>New Trophy</span>
                    </div>
                )}
                <HabitActionMenu habit={habit} />
            </div>

            <div className="relative z-10 flex items-start gap-4 mb-4">
                <div className="text-4xl w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-inner shadow-black/20">
                    {habit.icon || "✨"}
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 line-clamp-1">{habit.name.charAt(0).toUpperCase() + habit.name.slice(1)}</h3>
                    <div className="flex items-center gap-2">
                        <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            {habit.frequency}
                        </span>
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border",
                            isCompleted
                                ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                                : "text-slate-300 border-white/10 bg-white/[0.03]"
                        )}>
                            {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                            {isCompleted ? "Done today" : "Pending"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Flame className={cn("w-3.5 h-3.5", habit.currentStreak > 0 ? "text-orange-400" : "text-slate-500")} />
                        Current Streak
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">{habit.currentStreak}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
                    <div className="text-xs text-slate-400">Target</div>
                    <div className={cn("mt-1 text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent", colorTheme)}>
                        {habit.targetValue}
                    </div>
                </div>
            </div>

            <div className="mb-3 relative z-10">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Progress</span>
                    <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div
                        className={cn("h-full bg-gradient-to-r transition-all duration-500", colorTheme)}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 relative z-10">
                <Flame className={cn("w-3.5 h-3.5", habit.currentStreak > 0 ? "text-orange-500" : "text-slate-500")} />
                <span>
                    {isCompleted ? "Great work, this period is complete." : "Check in to keep your streak alive."}
                </span>
            </div>

            <button
                className={cn(
                    "w-full py-3 rounded-xl font-bold transition-all duration-300 relative z-10 border",
                    isCompleted
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 cursor-not-allowed"
                        : cn("bg-gradient-to-r hover:shadow-lg hover:-translate-y-0.5 border-white/10", colorTheme)
                )}
                onClick={handleCheckIn}
                disabled={isCompleted || isLoading}
            >
                {isLoading ? 'Checking in...' : (isCompleted ? '✓ Completed' : 'Check-in')}
            </button>
        </div>
    );
}
