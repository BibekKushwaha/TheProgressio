"use client";
import { AnalyticsHeader } from "@/components/analytics/AnalyticHeader";
import { FocusTrends } from "@/components/analytics/FocusTrend";
import { SessionBreakdown } from "@/components/analytics/SessionBreakdown";
import { StatCards } from "@/components/analytics/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, Target, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import {
  PriorityEnum,
  TaskStatus,
  useGetDailySummaryQuery,
  useGetFocusScoreQuery,
  useGetHabitsQuery,
  useGetTasksQuery,
  useGetWeeklyTrendsQuery,
} from "@repo/store";
import { redirect } from "next/navigation";
import { useMemo, useState } from "react";

export default function AnalyticsOverviewPage() {
  const [pastDays, setPastDays] = useState("1");
  const { data: summaryData, isLoading: isSummaryLoading } = useGetDailySummaryQuery(pastDays);
  const { data: focusScoreData, isLoading: isFocusLoading } = useGetFocusScoreQuery();
  useGetWeeklyTrendsQuery();
  const { data: tasks = [], isLoading: isTasksLoading } = useGetTasksQuery({ page: 1, limit: 500 });
  const { data: habitsResponse, isLoading: isHabitsLoading } = useGetHabitsQuery();

  const habits = useMemo(() => habitsResponse?.habits || [], [habitsResponse]);

  const taskMetrics = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const pending = tasks.filter((task) => task.status === TaskStatus.PENDING).length;
    const inProgress = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
    const completed = tasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
    const highPriority = tasks.filter((task) => task.priority === PriorityEnum.HIGH).length;
    const mediumPriority = tasks.filter((task) => task.priority === PriorityEnum.MEDIUM).length;
    const lowPriority = tasks.filter((task) => task.priority === PriorityEnum.LOW).length;
    const withoutDueDate = tasks.filter((task) => !task.dueDate).length;
    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
      return new Date(task.dueDate).getTime() < now;
    }).length;
    const dueToday = tasks.filter((task) => {
      if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
      const due = new Date(task.dueDate);
      const dueKey = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
      return dueKey === todayKey;
    }).length;

    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
      highPriority,
      mediumPriority,
      lowPriority,
      withoutDueDate,
      overdue,
      dueToday,
    };
  }, [tasks]);

  const habitMetrics = useMemo(() => {
    const total = habits.length;
    const daily = habits.filter((habit) => habit.frequency === "DAILY").length;
    const weekly = habits.filter((habit) => habit.frequency === "WEEKLY").length;
    const active = habits.filter((habit) => habit.streakStatus === "active").length;
    const broken = habits.filter((habit) => habit.streakStatus === "broken").length;
    const atRisk = habits.filter((habit) => habit.streakHealth === "at_risk").length;
    const mercyActive = habits.filter((habit) => habit.isMercyActive).length;
    const totalCurrentStreak = habits.reduce((sum, habit) => sum + (habit.currentStreak || 0), 0);
    const averageStreak = total > 0 ? Number((totalCurrentStreak / total).toFixed(1)) : 0;
    const longestStreak = habits.reduce((max, habit) => Math.max(max, habit.longestStreak || 0), 0);

    return {
      total,
      daily,
      weekly,
      active,
      broken,
      atRisk,
      mercyActive,
      averageStreak,
      longestStreak,
    };
  }, [habits]);

  const sortedTasks = useMemo(() => {
    const rank: Record<string, number> = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 1,
      [TaskStatus.COMPLETED]: 2,
    };
    return [...tasks].sort((left, right) => {
      const leftRank = rank[left.status] ?? 99;
      const rightRank = rank[right.status] ?? 99;
      if (leftRank !== rightRank) return leftRank - rightRank;

      const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    });
  }, [tasks]);

  const sortedHabits = useMemo(() => {
    return [...habits].sort((left, right) => (right.currentStreak || 0) - (left.currentStreak || 0));
  }, [habits]);

  const handleExportReport = () => {
    redirect("/reports");
  };

  const isWeekly = pastDays === "7";
  const timeLabel = isWeekly ? 'Weekly Focus' : 'Today\'s Focus';

  const stats = [
    {
      label: `${timeLabel} Time`,
      value: isSummaryLoading ? <Skeleton className="h-8 w-16" /> : `${summaryData?.stats?.totalHours ?? 0}h`,
      trend: '+12%',
      icon: Clock,
      gradient: 'from-cyan-500 to-blue-500',
      isLoading: isSummaryLoading
    },
    {
      label: `${timeLabel} Minutes`,
      value: isSummaryLoading ? <Skeleton className="h-8 w-20" /> : `${summaryData?.stats?.totalMinutes ?? 0}m`,
      trend: '+2',
      icon: CheckCircle,
      gradient: 'from-purple-500 to-pink-500',
      isLoading: isSummaryLoading
    },
    {
      label: 'Overall Focus Score',
      value: isFocusLoading ? <Skeleton className="h-8 w-24" /> : `${focusScoreData?.stats?.score ?? 0} / 100`,
      trend: '+5pts',
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
      isLoading: isFocusLoading
    },
    {
      label: `${isWeekly ? 'Weekly' : 'Daily'} Goal Progress`,
      value: isSummaryLoading ? <Skeleton className="h-8 w-16" /> : `${Math.round(((summaryData?.stats?.totalHours || 0) / (summaryData?.stats?.dailyGoalHours || 1)) * 100)}%`,
      trend: 'Target',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-500',
      isLoading: isSummaryLoading
    },

  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
      <div className="flex">
        <div className="flex-1 flex flex-col">
          <AnalyticsHeader
            pastDays={pastDays}
            setPastDays={setPastDays}
            onExport={handleExportReport}
          />

          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="space-y-4">
                <StatCards items={stats} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <FocusTrends pastDays={pastDays} />
                  </div>
                  <div>
                    <SessionBreakdown pastDays={pastDays} />
                  </div>
                </div>
                {/* <ActivityHeatmap pastDays={pastDays} /> */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card variant="glass" className="p-6">
                    <CardHeader>
                      <CardTitle>Task Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isTasksLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Array.from({ length: 10 }).map((_, index) => (
                            <Skeleton key={index} className="h-16 bg-white/10" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Total Tasks</p>
                            <Badge className="text-xl font-bold text-white">{taskMetrics.total}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Completed</p>
                            <Badge className="text-xl font-bold text-emerald-400">{taskMetrics.completed}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">In Progress</p>
                            <Badge className="text-xl font-bold text-cyan-400">{taskMetrics.inProgress}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Pending</p>
                            <Badge className="text-xl font-bold text-amber-400">{taskMetrics.pending}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Overdue</p>
                            <Badge className="text-xl font-bold text-rose-400">{taskMetrics.overdue}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Due Today</p>
                            <Badge className="text-xl font-bold text-violet-400">{taskMetrics.dueToday}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">High Priority</p>
                            <Badge className="text-xl font-bold text-rose-400">{taskMetrics.highPriority}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Medium Priority</p>
                            <Badge className="text-xl font-bold text-amber-400">{taskMetrics.mediumPriority}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Low Priority</p>
                            <Badge className="text-xl font-bold text-sky-400">{taskMetrics.lowPriority}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">No Due Date</p>
                            <Badge className="text-xl font-bold text-slate-300">{taskMetrics.withoutDueDate}</Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="p-6">
                    <CardHeader>
                      <CardTitle>Habit Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isHabitsLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Array.from({ length: 9 }).map((_, index) => (
                            <Skeleton key={index} className="h-16 bg-white/10" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Total Habits</p>
                            <Badge className="text-xl font-bold text-white">{habitMetrics.total}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Active Streaks</p>
                            <Badge className="text-xl font-bold text-emerald-400">{habitMetrics.active}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Broken Streaks</p>
                            <Badge className="text-xl font-bold text-rose-400">{habitMetrics.broken}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">At Risk</p>
                            <Badge className="text-xl font-bold text-amber-400">{habitMetrics.atRisk}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Daily Habits</p>
                            <Badge className="text-xl font-bold text-cyan-400">{habitMetrics.daily}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Weekly Habits</p>
                            <Badge className="text-xl font-bold text-violet-400">{habitMetrics.weekly}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Avg Current Streak</p>
                            <Badge className="text-xl font-bold text-sky-400">{habitMetrics.averageStreak}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                            <p className="text-slate-400">Longest Streak</p>
                            <Badge className="text-xl font-bold text-fuchsia-400">{habitMetrics.longestStreak}</Badge>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-3 col-span-2 flex items-center justify-between">
                            <p className="text-slate-400">Mercy Active</p>
                            <Badge className="text-xl font-bold text-orange-400">{habitMetrics.mercyActive}</Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card variant="glass" className="p-6">
                  <CardHeader>
                    <CardTitle>All Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isTasksLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <Skeleton key={index} className="h-12 bg-white/10" />
                        ))}
                      </div>
                    ) : sortedTasks.length === 0 ? (
                      <Empty>
                        <EmptyTitle>No tasks found.</EmptyTitle>
                      </Empty>
                    ) : (
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="text-left text-slate-400 border-b border-white/10">
                            <TableHead className="py-2 pr-4 text-white">Title</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Status</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Priority</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Due Date</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Category</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Recurring</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Subtasks</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Attachments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedTasks.map((task) => (
                            <TableRow key={task.id} className="border-b border-white/5 text-slate-200">
                              <TableCell className="py-2 pr-4 font-medium max-w-[260px] truncate">{task.title}</TableCell>
                              <TableCell className="py-2 pr-4">{task.status}</TableCell>
                              <TableCell className="py-2 pr-4">{task.priority}</TableCell>
                              <TableCell className="py-2 pr-4">{task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}</TableCell>
                              <TableCell className="py-2 pr-4">{task.category?.name || "—"}</TableCell>
                              <TableCell className="py-2 pr-4">{task.isRecurring ? "Yes" : "No"}</TableCell>
                              <TableCell className="py-2 pr-4">{task.subtasks?.length ?? 0}</TableCell>
                              <TableCell className="py-2 pr-4">{task.attachments?.length ?? 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card variant="glass" className="p-6">
                  <CardHeader>
                    <CardTitle>All Habits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isHabitsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <Skeleton key={index} className="h-12 bg-white/10" />
                        ))}
                      </div>
                    ) : sortedHabits.length === 0 ? (
                      <Empty>
                        <EmptyTitle>No habits found.</EmptyTitle>
                      </Empty>
                    ) : (
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="text-left text-slate-400 border-b border-white/10">
                            <TableHead className="py-2 pr-4 text-white">Habit</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Frequency</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Target</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Current Streak</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Longest Streak</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Streak Status</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Streak Health</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Last Log Date</TableHead>
                            <TableHead className="py-2 pr-4 text-white">Mercy</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedHabits.map((habit) => (
                            <TableRow key={habit.id} className="border-b border-white/5 text-slate-200">
                              <TableCell className="py-2 pr-4 font-medium">{habit.icon || "✨"} {habit.name}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.frequency}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.targetValue}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.currentStreak}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.longestStreak}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.streakStatus}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.streakHealth || "—"}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.lastLogDate ? new Date(habit.lastLogDate).toLocaleString() : "—"}</TableCell>
                              <TableCell className="py-2 pr-4">{habit.isMercyActive ? `Active (${habit.mercyDaysUsed || 0}/${habit.mercyDaysAllowed || 0})` : "Inactive"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

