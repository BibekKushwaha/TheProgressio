'use client';

import { useGetTasksQuery, useGetHabitsQuery, useGetDailySummaryQuery, useGetProfileQuery, useComposeNotificationMutation, Task, Habit } from '@repo/store';
import { Eye, Shield, Heart, TrendingUp, CheckCircle, Flame, Clock, AlertTriangle, BookOpen, Share2, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { TaskListItem } from '@/components/family-connect/TaskListItem';
import { HabitListItem } from '@/components/family-connect/HabitListItem';
import { toast } from 'sonner';

export default function FamilyConnectPage() {
    type Summary = {
        totalMinutes?: number;
        totalTasksCompleted?: number;
        averageSessionLength?: number;
        consistencyScore?: number;
    };

    const { data: profileData } = useGetProfileQuery();
    const { data: allTasks, isLoading: tasksLoading } = useGetTasksQuery({ page: 1, limit: 500 });
    const { data: habitsData, isLoading: habitsLoading } = useGetHabitsQuery();
    const { data: summaryData, isLoading: summaryLoading } = useGetDailySummaryQuery('7');
    const [composeNotification] = useComposeNotificationMutation();

    const user = profileData?.user;
    const tasks = (allTasks || []) as Task[];
    const habits =
        typeof habitsData === 'object' && habitsData !== null && 'habits' in habitsData
            ? ((habitsData as { habits?: Habit[] }).habits || [])
            : [];
    const summary =
        typeof summaryData === 'object' && summaryData !== null && 'stats' in summaryData
            ? (summaryData as { stats?: Summary }).stats
            : undefined;

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Workload intensity (tasks due in next 3 days)
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= threeDaysLater;
    });

    const handleSendQuickNudge = async () => {
        const message = window.prompt("Enter a message to encourage the student:");
        if (!message) return;

        try {
            await composeNotification({
                category: 'BEHAVIORAL_NUDGE',
                title: 'Family Message',
                body: message,
                priority: 'MEDIUM',
                deepLink: '/dashboard'
            }).unwrap();
            toast.success("Nudge sent to student!");
        } catch (_err) {
            toast.error("Failed to send nudge");
        }
    };
    const workloadIntensity = upcomingTasks.length >= 5 ? 'High' : upcomingTasks.length >= 3 ? 'Medium' : 'Low';

    const isLoading = tasksLoading || habitsLoading || summaryLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64 bg-white/5" />
                <Skeleton className="h-6 w-96 bg-white/5" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Family Connect"
                subtitle={`Read-only progress dashboard for ${user?.username || 'Student'}`}
            >
                <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg shadow-pink-500/20 mr-4 hidden md:block">
                    <Heart className="w-8 h-8 text-white" />
                </div>
                <Button variant="outline" className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-200">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Link
                </Button>
            </PageHeader>

            {/* Read-Only Notice */}
            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Eye className="w-5 h-5 text-indigo-400" />
                <span className="text-sm text-slate-300">
                    <span className="font-bold text-indigo-400">Read-only view</span> — Mentors and parents can monitor progress without editing any data.
                </span>
                <Button
                    size="sm"
                    onClick={handleSendQuickNudge}
                    className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-xs gap-2"
                >
                    <MessageSquare className="w-3 h-3" />
                    Send Quick Nudge
                </Button>
                <Shield className="w-4 h-4 text-indigo-400" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={CheckCircle}
                    title={`${completionRate}%`}
                    description="Tasks Completed"
                    subDescription={`${completedTasks}/${totalTasks} total`}
                    iconColor="text-green-400"
                    variant="glass"
                    className="text-center p-5"
                />
                <StatCard
                    icon={Flame}
                    title={habits.length}
                    description="Active Habits"
                    subDescription="tracked daily"
                    iconColor="text-orange-400"
                    variant="glass"
                    className="text-center p-5"
                />
                <StatCard
                    icon={Clock}
                    title={`${summary?.totalMinutes ? Math.round(summary.totalMinutes / 60) : 0}h`}
                    description="Focus Time (7d)"
                    subDescription="deep work logged"
                    iconColor="text-blue-400"
                    variant="glass"
                    className="text-center p-5"
                />
                <StatCard
                    icon={AlertTriangle}
                    title={workloadIntensity}
                    description="Workload (3d)"
                    subDescription={`${upcomingTasks.length} tasks due`}
                    iconColor={workloadIntensity === 'High' ? 'text-red-400' : workloadIntensity === 'Medium' ? 'text-yellow-400' : 'text-green-400'}
                    variant="glass"
                    className="text-center p-5"
                />
            </div>

            {/* Upcoming Tasks (read-only) */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        Upcoming Assignments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {upcomingTasks.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No urgent assignments in the next 3 days. 🎉</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingTasks.slice(0, 8).map(task => (
                                <TaskListItem key={task.id} task={task} now={now} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Habits Overview (read-only) */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        Habit Streaks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {habits.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No habits tracked yet.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {habits.map((habit) => (
                                <HabitListItem key={habit.id} habit={habit} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Weekly Analytics (read-only) */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Weekly Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.totalTasksCompleted ?? 0}</div>
                            <div className="text-xs text-slate-400 mt-1">Tasks finished</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.averageSessionLength ? Math.round(summary.averageSessionLength) : 0}m</div>
                            <div className="text-xs text-slate-400 mt-1">Avg. daily focus</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.consistencyScore ?? 0}%</div>
                            <div className="text-xs text-slate-400 mt-1">Consistency score</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
