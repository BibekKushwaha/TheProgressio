"use client";
import { AnalyticsHeader } from "@/components/analytics/AnalyticHeader";
import { FocusTrends } from "@/components/analytics/FocusTrend";
import { SessionBreakdown } from "@/components/analytics/SessionBreakdown";
import { StatCards } from "@/components/analytics/StatCard";
import { MetricGrid } from "@/components/analytics/MetricCard";
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
import {
  TaskStatus,
  useGetDailySummaryQuery,
  useGetDashboardSummaryQuery,
  useGetHabitsQuery,
  useGetTasksQuery,
  useGetTaskMetricsQuery,
} from "@repo/store";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useMemo, useState } from "react";
import { exportTasksToCSV, downloadCSV } from "@/lib/exportUtils";
import { toast } from "sonner";

export default function AnalyticsOverviewPage() {
  const [pastDays, setPastDays] = useState("1");
  const isVisible = usePageVisibility();
  const pollMs = isVisible ? 60000 : 0;

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching
  } = useGetDailySummaryQuery(pastDays, {
    pollingInterval: pollMs,
  });

  // BFF replaces useGetFocusScoreQuery — gets score+breakdown in the same
  // request as leakage/peak, so no extra round-trip on page load.
  const {
    data: dashboardData,
    isLoading: isDashLoading,
    isFetching: isDashFetching
  } = useGetDashboardSummaryQuery(
    { leakageDays: parseInt(pastDays) || 7, peakDays: 30 },
    { pollingInterval: pollMs }
  );

  // Lightweight count-only endpoint — no full task rows transferred.
  const {
    data: taskMetricsData,
    isLoading: isTaskMetricsLoading,
  } = useGetTaskMetricsQuery(undefined);

  // Full task list only for the table render and CSV export.
  const {
    data: tasks = [],
    isLoading: isTasksLoading
  } = useGetTasksQuery({ page: 1, limit: 50 });

  const {
    data: habitsResponse,
    isLoading: isHabitsLoading
  } = useGetHabitsQuery(undefined);

  const habits = useMemo(() => habitsResponse?.habits || [], [habitsResponse]);

  // Use server-computed counts from the lightweight /tasks/metrics endpoint.
  const taskMetrics = useMemo(() => ({
    total:          taskMetricsData?.total          ?? 0,
    pending:        taskMetricsData?.pending        ?? 0,
    inProgress:     taskMetricsData?.inProgress     ?? 0,
    completed:      taskMetricsData?.completed      ?? 0,
    highPriority:   taskMetricsData?.highPriority   ?? 0,
    mediumPriority: taskMetricsData?.mediumPriority ?? 0,
    lowPriority:    taskMetricsData?.lowPriority    ?? 0,
    withoutDueDate: taskMetricsData?.withoutDueDate ?? 0,
    overdue:        taskMetricsData?.overdue        ?? 0,
    dueToday:       taskMetricsData?.dueToday       ?? 0,
  }), [taskMetricsData]);

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
    const csvContent = exportTasksToCSV(sortedTasks);
    downloadCSV(csvContent, `analytics_tasks_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Analytics exported to CSV successfully!");
  };

  const isWeekly = pastDays === "7";
  const timeLabel = isWeekly ? 'Weekly' : 'Today\'s';

  const stats = useMemo(() => {
    const isSummaryMissing = !summaryData && (isSummaryLoading || isSummaryFetching);
    const isDashMissing = !dashboardData && (isDashLoading || isDashFetching);

    const hours = summaryData?.stats?.totalHours ?? 0;
    const formattedHours = hours >= 10 ? Math.round(hours) : hours.toFixed(1);

    const focusScore = dashboardData?.focus?.score ?? 0;
    const scoreDisplay = Math.round(focusScore).toString();

    const progress = summaryData?.stats?.dailyGoalHours
      ? Math.min(100, Math.round((hours / summaryData.stats.dailyGoalHours) * 100))
      : 0;

    return [
      {
        label: `${timeLabel} Focus Time`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-16 bg-white/10" /> : `${formattedHours}h`,
        trend: isWeekly ? "Total" : "+12%",
        icon: Clock,
        gradient: 'from-cyan-500 to-blue-500',
        isLoading: isSummaryLoading && !summaryData
      },
      {
        label: `${timeLabel} Completion`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-12 bg-white/10" /> : `${summaryData?.stats?.totalTasksCompleted ?? 0}`,
        trend: "Tasks",
        icon: CheckCircle,
        gradient: 'from-purple-500 to-pink-500',
        isLoading: isSummaryLoading && !summaryData
      },
      {
        label: 'Overall Focus Score',
        value: isDashMissing ? <Skeleton className="h-8 w-24 bg-white/10" /> : `${scoreDisplay}/100`,
        trend: focusScore >= 80 ? "Excellent" : focusScore >= 60 ? "Good" : "Steady",
        icon: Target,
        gradient: 'from-green-500 to-emerald-500',
        isLoading: isDashLoading && !dashboardData
      },
      {
        label: `${isWeekly ? 'Weekly' : 'Daily'} Target`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-16 bg-white/10" /> : `${progress}%`,
        trend: "Progress",
        icon: TrendingUp,
        gradient: 'from-orange-500 to-red-500',
        isLoading: isSummaryLoading && !summaryData
      },
    ];
  }, [summaryData, dashboardData, isSummaryLoading, isSummaryFetching, isDashLoading, isDashFetching, timeLabel, isWeekly]);

  return (
    <div className="space-y-8">
      <AnalyticsHeader
        pastDays={pastDays}
        setPastDays={setPastDays}
        onExport={handleExportReport}
      />
      <StatCards items={stats} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 min-w-0">
          <FocusTrends pastDays={pastDays} />
        </div>
        <div className="min-w-0">
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
            {isTaskMetricsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 10 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 bg-white/10" />
                ))}
              </div>
            ) : (
              <MetricGrid
                metrics={[
                  { label: "Total Tasks", value: taskMetrics.total, colorClass: "bg-slate-400" },
                  { label: "Completed", value: taskMetrics.completed, colorClass: "bg-emerald-400" },
                  { label: "In Progress", value: taskMetrics.inProgress, colorClass: "bg-cyan-400" },
                  { label: "Pending", value: taskMetrics.pending, colorClass: "bg-amber-400" },
                  { label: "Overdue", value: taskMetrics.overdue, colorClass: "bg-rose-400" },
                  { label: "Due Today", value: taskMetrics.dueToday, colorClass: "bg-violet-400" },
                  { label: "High Priority", value: taskMetrics.highPriority, colorClass: "bg-rose-400" },
                  { label: "Medium Priority", value: taskMetrics.mediumPriority, colorClass: "bg-amber-400" },
                  { label: "Low Priority", value: taskMetrics.lowPriority, colorClass: "bg-sky-400" },
                  { label: "No Due Date", value: taskMetrics.withoutDueDate, colorClass: "bg-slate-300 text-slate-800" },
                ]}
              />
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
              <MetricGrid
                metrics={[
                  { label: "Total Habits", value: habitMetrics.total, colorClass: "bg-white text-slate-800" },
                  { label: "Active Streaks", value: habitMetrics.active, colorClass: "bg-emerald-400" },
                  { label: "Broken Streaks", value: habitMetrics.broken, colorClass: "bg-rose-400" },
                  { label: "At Risk", value: habitMetrics.atRisk, colorClass: "bg-amber-400" },
                  { label: "Daily Habits", value: habitMetrics.daily, colorClass: "bg-cyan-400" },
                  { label: "Weekly Habits", value: habitMetrics.weekly, colorClass: "bg-violet-400" },
                  { label: "Avg Current Streak", value: habitMetrics.averageStreak, colorClass: "bg-sky-400" },
                  { label: "Longest Streak", value: habitMetrics.longestStreak, colorClass: "bg-fuchsia-400" },
                  { label: "Mercy Active", value: habitMetrics.mercyActive, colorClass: "bg-orange-400", colSpan: 2 },
                ]}
              />
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
            <div className="w-full overflow-x-auto">
              <Table className="text-sm min-w-[920px]">
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
            </div>
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
            <div className="w-full overflow-x-auto">
              <Table className="text-sm min-w-[980px]">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

