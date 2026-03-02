'use client';

import { useResolveFamilyLinkQuery, useGetTasksQuery, useGetHabitsQuery, useGetDailySummaryQuery, useSendMentorFeedbackMutation, Task, Habit } from '@repo/store';
import { Eye, Shield, CheckCircle, Flame, Clock, AlertTriangle, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { TaskListItem } from '@/components/family-connect/TaskListItem';
import { HabitListItem } from '@/components/family-connect/HabitListItem';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function FamilyLinkAcceptPage() {
    const params = useParams();
    const token = Array.isArray(params?.token) ? params.token[0] : params?.token;

    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
    const { data: linkData, isLoading: linkLoading, isError: linkError } = useResolveFamilyLinkQuery(token || '', {
        skip: !token
    });

    useEffect(() => {
        if (token) {
            // Set the token for subsequent API calls
            localStorage.setItem('family_share_token', token);
        }
    }, [token]);

    useEffect(() => {
        if (linkData) {
            setIsTokenValid(true);
        } else if (linkError) {
            setIsTokenValid(false);
            localStorage.removeItem('family_share_token');
        }
    }, [linkData, linkError]);

    // Fetch data using the token (which is now in localStorage)
    const allTasksQueryArgs = useMemo(() => ({ page: 1, limit: 500 }), []);
    const { data: allTasks, isLoading: tasksLoading } = useGetTasksQuery(allTasksQueryArgs, { skip: !isTokenValid });
    const { data: habitsData, isLoading: habitsLoading } = useGetHabitsQuery(undefined, { skip: !isTokenValid });
    const { data: summaryData, isLoading: summaryLoading } = useGetDailySummaryQuery('7', { skip: !isTokenValid });
    const [sendFeedback, { isLoading: isSendingFeedback }] = useSendMentorFeedbackMutation();
    const [fromLabel, setFromLabel] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const tasks = (allTasks || []) as Task[];
    const habits =
        typeof habitsData === 'object' && habitsData !== null && 'habits' in habitsData
            ? ((habitsData as { habits?: Habit[] }).habits || [])
            : [];

    type Summary = {
        totalMinutes?: number;
        totalTasksCompleted?: number;
        averageSessionLength?: number;
        consistencyScore?: number;
    };

    const summary =
        typeof summaryData === 'object' && summaryData !== null && 'stats' in summaryData
            ? (summaryData as { stats?: Summary }).stats
            : undefined;

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= threeDaysLater;
    });

    const workloadIntensity = upcomingTasks.length >= 5 ? 'High' : upcomingTasks.length >= 3 ? 'Medium' : 'Low';

    if (linkLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (isTokenValid === false) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <Card variant="glass" className="max-w-md w-full border-red-500/20 bg-red-950/10">
                    <CardHeader>
                        <div className="flex items-center gap-3 text-red-400">
                            <AlertCircle className="w-6 h-6" />
                            <CardTitle>Invalid or Expired Link</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">
                            This family share link is invalid, expired, or has been revoked. Please ask the student to generate a new link.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isTokenValid) return null; // Wait for valid state

    const isLoading = tasksLoading || habitsLoading || summaryLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 p-6 space-y-6 max-w-7xl mx-auto">
                <Skeleton className="h-12 w-64 bg-white/5" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 overflow-x-hidden p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <PageHeader
                    title="Student Progress Dashboard"
                    subtitle={`Viewing progress for ${linkData?.link?.userId ? 'Student' : 'Student'}`} // Ideally we get username via another call or meta
                >
                    <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-sm flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Secure Family Access
                    </div>
                </PageHeader>

                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <Eye className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm text-slate-300">
                        <span className="font-bold text-indigo-400">Read-only view</span> — You are viewing live progress. Data cannot be modified.
                    </span>
                </div>

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    {/* Habits Overview */}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {habits.map((habit) => (
                                        <HabitListItem key={habit.id} habit={habit} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Weekly Analytics */}
                <Card variant="glass">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Weekly Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* Mentor feedback (only when token permission allows) */}
                {(() => {
                    const perms = (linkData?.link?.permissions ?? '').toUpperCase();
                    const canSend = perms === 'FEEDBACK' || perms === 'FULL_ACCESS';
                    if (!canSend) return null;

                    return (
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Leave Feedback</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Your name (optional)</Label>
                                        <Input
                                            value={fromLabel}
                                            onChange={(e) => setFromLabel(e.target.value)}
                                            placeholder="e.g. Mom, Mentor"
                                            className="bg-white/5 border-white/10"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Message</Label>
                                    <textarea
                                        value={feedbackMessage}
                                        onChange={(e) => setFeedbackMessage(e.target.value)}
                                        placeholder="Write a note for the student…"
                                        className="w-full min-h-[120px] rounded-md bg-white/5 border border-white/10 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                const msg = feedbackMessage.trim();
                                                if (!msg) return toast.error('Message is required');
                                                await sendFeedback({ message: msg, fromLabel: fromLabel.trim() || undefined }).unwrap();
                                                toast.success('Feedback sent');
                                                setFeedbackMessage('');
                                            } catch (error) {
                                                console.error(error);
                                                toast.error('Failed to send feedback');
                                            }
                                        }}
                                        disabled={isSendingFeedback}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        {isSendingFeedback ? 'Sending…' : 'Send'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}
            </div>
        </div>
    );
}
