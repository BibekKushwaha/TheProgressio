"use client";

import { useState, useMemo } from 'react';
import { useGetTasksQuery, useGetHabitsQuery, useGetDailySummaryQuery, useGetProfileQuery, useGetTaskMetricsQuery, useComposeNotificationMutation, Task, Habit } from '@repo/store';
import { Eye, Shield, TrendingUp, CheckCircle, Flame, Clock, AlertTriangle, BookOpen, Share2, MessageSquare, Download } from 'lucide-react';
import { exportTasksToCSV, downloadCSV } from '@/lib/exportUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { TaskListItem } from '@/components/family-connect/TaskListItem';
import { HabitListItem } from '@/components/family-connect/HabitListItem';
import { toast } from 'sonner';

type Summary = {
    totalMinutes?: number;
    totalTasksCompleted?: number;
    averageSessionLength?: number;
    consistencyScore?: number;
};

const UPCOMING_TASK_ARGS = { page: 1, limit: 10, sortBy: 'dueDate', sortOrder: 'asc' } as const;

export function FamilyConnectClient() {
    const { data: profileData } = useGetProfileQuery();
    // FIX: Fetch only what's needed for the table display (10 upcoming) — not 500 tasks for counting
    const { data: upcomingTasksData, isLoading: tasksLoading } = useGetTasksQuery(UPCOMING_TASK_ARGS);
    // FIX: Use the lightweight metrics endpoint for counts — avoids 500-task payload
    const { data: taskMetricsData, isLoading: metricsLoading } = useGetTaskMetricsQuery(undefined);
    const { data: habitsData, isLoading: habitsLoading } = useGetHabitsQuery();
    const { data: summaryData, isLoading: summaryLoading } = useGetDailySummaryQuery('7');
    const [composeNotification] = useComposeNotificationMutation();
    const [nudgeOpen, setNudgeOpen] = useState(false);
    const [nudgeMessage, setNudgeMessage] = useState('');
    const [shareOpen, setShareOpen] = useState(false);

    const user = profileData?.user;

    // FIX: Use server-computed metrics for aggregate counts
    const completedTasks = taskMetricsData?.completed ?? 0;
    const totalTasks = taskMetricsData?.total ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // FIX: useMemo wraps the filter so it never re-runs when nudgeMessage changes
    const now = useMemo(() => new Date(), []);
    const threeDaysLater = useMemo(() => new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), [now]);

    const upcomingTasks = useMemo(() => {
        const tasks = (upcomingTasksData || []) as Task[];
        return tasks.filter(t => {
            if (!t.dueDate || t.status === 'COMPLETED') return false;
            const due = new Date(t.dueDate);
            return due >= now && due <= threeDaysLater;
        });
    }, [upcomingTasksData, now, threeDaysLater]);

    const habits = useMemo<Habit[]>(() => {
        if (typeof habitsData === 'object' && habitsData !== null && 'habits' in habitsData) {
            return (habitsData as { habits?: Habit[] }).habits || [];
        }
        return [];
    }, [habitsData]);

    const summary = useMemo<Summary | undefined>(() => {
        if (typeof summaryData === 'object' && summaryData !== null && 'stats' in summaryData) {
            return (summaryData as { stats?: Summary }).stats;
        }
        return undefined;
    }, [summaryData]);

    const workloadIntensity = useMemo(
        () => upcomingTasks.length >= 5 ? 'High' : upcomingTasks.length >= 3 ? 'Medium' : 'Low',
        [upcomingTasks.length]
    );

    const handleSendNudgeConfirm = async () => {
        if (!nudgeMessage.trim()) return;
        try {
            await composeNotification({
                category: 'BEHAVIORAL_NUDGE',
                title: 'Family Message',
                body: nudgeMessage,
                priority: 'MEDIUM',
                deepLink: '/dashboard'
            }).unwrap();
            toast.success("Nudge sent to student!");
            setNudgeOpen(false);
        } catch (_err) {
            toast.error("Failed to send nudge");
        }
    };

    const handleExportReport = () => {
        const tasks = (upcomingTasksData || []) as Task[];
        const csvContent = exportTasksToCSV(tasks);
        downloadCSV(csvContent, `family_report_${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success("Report exported to CSV successfully!");
    };

    const handleCopyLink = () => {
        if (typeof window === 'undefined') return;
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
    };

    const isLoading = tasksLoading || metricsLoading || habitsLoading || summaryLoading;

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
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShareOpen(true)}
                        className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-200"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Link
                    </Button>
                    <Button variant="outline" onClick={handleExportReport} className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-200">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </PageHeader>

            {/* Read-Only Notice */}
            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Eye className="w-5 h-5 text-indigo-400" />
                <span className="text-sm text-slate-300">
                    <span className="font-bold text-indigo-400">Read-only view</span> — Mentors and parents can monitor progress without editing any data.
                </span>
                <Button
                    size="sm"
                    onClick={() => { setNudgeMessage(''); setNudgeOpen(true); }}
                    className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-xs gap-2"
                >
                    <MessageSquare className="w-3 h-3" />
                    Send Quick Nudge
                </Button>
                <Shield className="w-4 h-4 text-indigo-400" />
            </div>

            {/* Summary Cards — driven by lightweight metrics, no 500-task payload */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={CheckCircle} title={`${completionRate}%`} description="Tasks Completed" subDescription={`${completedTasks}/${totalTasks} total`} iconColor="text-green-400" variant="glass" className="text-center p-5" />
                <StatCard icon={Flame} title={habits.length} description="Active Habits" subDescription="tracked daily" iconColor="text-orange-400" variant="glass" className="text-center p-5" />
                <StatCard icon={Clock} title={`${summary?.totalMinutes ? Math.round(summary.totalMinutes / 60) : 0}h`} description="Focus Time (7d)" subDescription="deep work logged" iconColor="text-blue-400" variant="glass" className="text-center p-5" />
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

            {/* Upcoming Tasks */}
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

            {/* Habits */}
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

            {/* Weekly Analytics */}
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

            {/* Nudge Dialog */}
            <Dialog open={nudgeOpen} onOpenChange={setNudgeOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Send Encouragement</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-400 mb-2">Enter a message to motivate <span className="font-semibold text-slate-200">{user?.username || 'the student'}</span>:</p>
                    <Input
                        autoFocus
                        value={nudgeMessage}
                        onChange={(e) => setNudgeMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendNudgeConfirm()}
                        placeholder="e.g. You're on a great streak, keep it up!"
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setNudgeOpen(false)} className="bg-white/5 border-white/10 text-slate-300">Cancel</Button>
                        <Button onClick={handleSendNudgeConfirm} disabled={!nudgeMessage.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Share Dialog — FIX: shows a clear warning that a backend token is required for real sharing */}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Share Progress Link</DialogTitle>
                    </DialogHeader>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 mb-2">
                        ⚠️ Public sharing requires a secure backend token. Currently, sharing this link will redirect the recipient to the login screen. Contact your developer to enable tokenized read-only share links.
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Button
                            variant="outline"
                            className="flex flex-col items-center gap-3 h-auto py-6 bg-green-500/10 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30 text-green-400"
                            onClick={() => {
                                if (typeof window === 'undefined') return;
                                const url = window.location.href;
                                const text = `Check out my academic progress on TheProgressio!`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                            }}
                        >
                            <MessageSquare className="w-8 h-8" />
                            <span className="text-sm font-semibold">WhatsApp</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="flex flex-col items-center gap-3 h-auto py-6 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20 hover:border-pink-500/30 text-pink-400"
                            onClick={() => {
                                handleCopyLink();
                                setTimeout(() => {
                                    if (typeof window !== 'undefined') window.open('https://www.instagram.com/direct/inbox/', '_blank');
                                }, 1000);
                            }}
                        >
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                            <span className="text-sm font-semibold">Instagram</span>
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 p-2 bg-white/5 border border-white/10 rounded-lg">
                        <Input
                            readOnly
                            value={typeof window !== 'undefined' ? window.location.href : ''}
                            className="bg-transparent border-none text-xs text-slate-400 h-8 focus-visible:ring-0"
                        />
                        <Button size="sm" onClick={handleCopyLink} className="h-8 bg-white/10 hover:bg-white/20 text-xs">
                            Copy
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
