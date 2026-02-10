"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { useGetHabitStatsQuery } from "@repo/store"
import { Loader2, Flame, Trophy, CheckCircle, Calendar, BarChart2 } from "lucide-react"

interface HabitStatsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    habitId: string
}

export function HabitStatsModal({ open, onOpenChange, habitId }: HabitStatsModalProps) {
    const { data, isLoading } = useGetHabitStatsQuery(habitId, { skip: !open })
    const stats = data?.stats

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 text-white border-white/10 max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Habit Statistics</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Detailed specific analytics for this habit
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : stats ? (
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm">Current Streak</span>
                                </div>
                                <div className="text-2xl font-bold">{stats.currentStreak}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm">Longest Streak</span>
                                </div>
                                <div className="text-2xl font-bold">{stats.longestStreak}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-sm">Total Completions</span>
                                </div>
                                <div className="text-2xl font-bold">{stats.totalCompletions}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <BarChart2 className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm">Completion Rate</span>
                                </div>
                                <div className="text-2xl font-bold">{Math.round(stats.completionRate * 100)}%</div>
                            </div>
                        </div>

                        {/* Calendar Heatmap */}
                        {stats.heatmapData && stats.heatmapData.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 mb-4 text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm">Activity Heatmap (Last 7 Weeks)</span>
                                </div>
                                <div className="grid grid-cols-7 gap-1.5">
                                    {stats.heatmapData.slice(-49).map((day, i) => {
                                        const intensity = day.value > 0 ? Math.min(Math.ceil(day.value / 2), 4) : 0;
                                        const colors = [
                                            'bg-white/5',
                                            'bg-green-500/20',
                                            'bg-green-500/40',
                                            'bg-green-500/60',
                                            'bg-green-500/80',
                                        ];
                                        return (
                                            <div
                                                key={i}
                                                title={`${day.date}: ${day.value} completions`}
                                                className={`aspect-square rounded ${colors[intensity]} border border-white/10 hover:scale-110 transition-transform cursor-pointer`}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                                    <span>Less</span>
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <div key={i} className={`w-3 h-3 rounded ${['bg-white/5', 'bg-green-500/20', 'bg-green-500/40', 'bg-green-500/60', 'bg-green-500/80'][i]}`} />
                                        ))}
                                    </div>
                                    <span>More</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        Failed to load statistics
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
