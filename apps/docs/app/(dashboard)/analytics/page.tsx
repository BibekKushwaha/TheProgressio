"use client";

import { AnalyticsHeader } from "@/components/analytics/AnalyticHeader";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import Link from "next/link";
import { FocusTrends } from "@/components/analytics/FocusTrend";
import { SessionBreakdown } from "@/components/analytics/SessionBreakdown";
import { StatCards } from "@/components/analytics/StatCard";
import { MetricGrid } from "@/components/analytics/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, Target, TrendingUp, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';

import {
  useGetDailySummaryQuery,
  useGetDashboardSummaryQuery,
  useGetHabitsQuery,
  useGetTaskMetricsQuery,
} from "@repo/store";
import { useEffect, useMemo, useState } from "react";

export default function AnalyticsPage() {
  const [pastDays, setPastDays] = useState("1");

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetDailySummaryQuery(pastDays);

  const {
    data: dashboardData,
    isLoading: isDashLoading,
    isFetching: isDashFetching,
    isError: isDashError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardSummaryQuery(
    { leakageDays: parseInt(pastDays) || 7, peakDays: 30 }
  );

  const {
    data: taskMetricsData,
    isLoading: isTaskMetricsLoading,
    isError: isTaskMetricsError,
    error: taskMetricsError,
    refetch: refetchTaskMetrics,
  } = useGetTaskMetricsQuery(undefined);

  const {
    data: habitsResponse,
    isLoading: isHabitsLoading,
    isError: isHabitsError,
    error: habitsError,
    refetch: refetchHabits,
  } = useGetHabitsQuery(undefined);

  useEffect(() => {
    if (summaryError) {
      reportApiError(getApiErrorReportStatus(summaryError), 'getDailySummary', summaryError);
    }
  }, [summaryError]);

  useEffect(() => {
    if (dashboardError) {
      reportApiError(getApiErrorReportStatus(dashboardError), 'getDashboardSummary', dashboardError);
    }
  }, [dashboardError]);

  useEffect(() => {
    if (taskMetricsError) {
      reportApiError(getApiErrorReportStatus(taskMetricsError), 'getTaskMetrics', taskMetricsError);
    }
  }, [taskMetricsError]);

  useEffect(() => {
    if (habitsError) {
      reportApiError(getApiErrorReportStatus(habitsError), 'getHabits', habitsError);
    }
  }, [habitsError]);

  const habits = useMemo(() => habitsResponse?.habits || [], [habitsResponse]);

  const taskMetrics = {
    total: taskMetricsData?.total ?? 0,
    pending: taskMetricsData?.pending ?? 0,
    inProgress: taskMetricsData?.inProgress ?? 0,
    completed: taskMetricsData?.completed ?? 0,
    highPriority: taskMetricsData?.highPriority ?? 0,
    mediumPriority: taskMetricsData?.mediumPriority ?? 0,
    lowPriority: taskMetricsData?.lowPriority ?? 0,
    withoutDueDate: taskMetricsData?.withoutDueDate ?? 0,
    overdue: taskMetricsData?.overdue ?? 0,
    dueToday: taskMetricsData?.dueToday ?? 0,
  };

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

  const isWeekly = pastDays === "7";
  const timeLabel = isWeekly ? 'Weekly' : 'Today\'s';
  const failedPanels = [
    isSummaryError && !summaryData ? 'focus summary' : null,
    isDashError && !dashboardData ? 'focus score' : null,
    isTaskMetricsError && !taskMetricsData ? 'task metrics' : null,
    isHabitsError && !habitsResponse ? 'habit metrics' : null,
  ].filter((value): value is string => Boolean(value));
  const isEmptyAnalytics = !isSummaryLoading && !isDashLoading && !isTaskMetricsLoading && !isHabitsLoading
    && failedPanels.length === 0
    && taskMetrics.total === 0
    && habitMetrics.total === 0
    && (summaryData?.stats?.totalHours ?? 0) === 0;

  const stats = useMemo(() => {
    const isSummaryMissing = !summaryData && (isSummaryLoading || isSummaryFetching);
    const isDashMissing = !dashboardData && (isDashLoading || isDashFetching);
    const isSummaryUnavailable = isSummaryError && !summaryData;
    const isDashUnavailable = isDashError && !dashboardData;

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
        value: isSummaryMissing ? <Skeleton className="h-8 w-16 bg-white/10" /> : isSummaryUnavailable ? 'Unavailable' : `${formattedHours}h`,
        trend: isWeekly ? "Total" : "+12%",
        trendDirection: (hours > 0 ? 'up' : 'neutral') as 'up' | 'neutral' | 'down',
        icon: Clock,
        gradient: 'from-cyan-500 to-blue-500',
        isLoading: isSummaryLoading && !summaryData
      },
      {
        label: `${timeLabel} Completion`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-12 bg-white/10" /> : isSummaryUnavailable ? 'Unavailable' : `${summaryData?.stats?.totalTasksCompleted ?? 0}`,
        trend: "Tasks",
        trendDirection: ((summaryData?.stats?.totalTasksCompleted ?? 0) > 0 ? 'up' : 'neutral') as 'up' | 'neutral' | 'down',
        icon: CheckCircle,
        gradient: 'from-purple-500 to-pink-500',
        isLoading: isSummaryLoading && !summaryData
      },
      {
        label: 'Overall Focus Score',
        value: isDashMissing ? <Skeleton className="h-8 w-24 bg-white/10" /> : isDashUnavailable ? 'Unavailable' : `${scoreDisplay}/100`,
        trend: focusScore >= 80 ? "Excellent" : focusScore >= 60 ? "Good" : "Steady",
        trendDirection: (focusScore >= 80 ? 'up' : focusScore >= 50 ? 'neutral' : 'down') as 'up' | 'neutral' | 'down',
        icon: Target,
        gradient: 'from-green-500 to-emerald-500',
        isLoading: isDashLoading && !dashboardData
      },
      {
        label: `${isWeekly ? 'Weekly' : 'Daily'} Target`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-16 bg-white/10" /> : isSummaryUnavailable ? 'Unavailable' : `${progress}%`,
        trend: "Progress",
        trendDirection: (progress >= 80 ? 'up' : progress >= 50 ? 'neutral' : 'down') as 'up' | 'neutral' | 'down',
        icon: TrendingUp,
        gradient: 'from-orange-500 to-red-500',
        isLoading: isSummaryLoading && !summaryData
      },
    ];
  }, [summaryData, dashboardData, isSummaryLoading, isSummaryFetching, isSummaryError, isDashLoading, isDashFetching, isDashError, timeLabel, isWeekly]);

  const retryAll = () => {
    void Promise.allSettled([
      refetchSummary(),
      refetchDashboard(),
      refetchTaskMetrics(),
      refetchHabits(),
    ]);
  };

  return (
    <div className="space-y-8">
      <AnalyticsHeader
        pastDays={pastDays}
        setPastDays={setPastDays}
      />
      {failedPanels.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <p>
                Some analytics panels are using partial data because {failedPanels.join(', ')} {failedPanels.length === 1 ? 'is' : 'are'} temporarily unavailable.
              </p>
            </div>
            <button
              onClick={retryAll}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry data
            </button>
          </div>
        </div>
      ) : null}
      {isEmptyAnalytics ? (
        <AnalyticsEmptyState
          title="Your analytics will come alive after your first few study actions"
          description="Create a task, log one habit, or complete a focus session. As soon as you have a little activity, this page will turn into a real study dashboard instead of empty numbers."
          primaryHref="/createtask"
          primaryLabel="Create your first task"
          secondaryHref="/habits"
          secondaryLabel="Start a study habit"
        />
      ) : (
        <>
          <StatCards items={stats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 min-w-0">
              <FocusTrends pastDays={pastDays} />
            </div>
            <div className="min-w-0">
              <SessionBreakdown pastDays={pastDays} />
            </div>
          </div>

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
                ) : isTaskMetricsError && !taskMetricsData ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Task metrics are temporarily unavailable. Retry data loading to refresh this panel.
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
                ) : isHabitsError && !habitsResponse ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Habit metrics are temporarily unavailable. Retry data loading to refresh this panel.
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
              <CardTitle>Weekly Review</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="max-w-2xl text-sm text-slate-400">
                Need a tighter weekly snapshot and next-step plan? Open weekly review for priorities, adjustments, and a compact progress summary.
              </p>
              <Link
                href="/analytics/weekly-review"
                className="inline-flex items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
              >
                Open weekly review
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
