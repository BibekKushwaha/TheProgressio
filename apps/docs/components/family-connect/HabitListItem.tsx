interface Habit {
    id: string;
    name: string;
    icon?: string | null;
    currentStreak?: number | null;
}

export const HabitListItem = ({ habit }: { habit: Habit }) => (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
        <div className="text-2xl">{habit.icon || '📌'}</div>
        <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{habit.name}</div>
            <div className="text-xs text-slate-400">
                {habit.currentStreak ?? 0} day streak
            </div>
        </div>
        <div className={`text-xs font-bold px-2 py-0.5 rounded ${(habit.currentStreak ?? 0) > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-slate-400'}`}>
            🔥 {habit.currentStreak ?? 0}
        </div>
    </div>
);
