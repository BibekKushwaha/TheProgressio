"use client";

import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { FocusTrends } from "@/components/analytics/FocusTrend";
import { SessionBreakdown } from "@/components/analytics/SessionBreakdown";
import { MetricGrid } from "@/components/analytics/MetricCard";
import { WeeklyReviewDetailCards, WeeklyReviewSection } from "@/components/analytics/WeeklyReviewSection";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';
import { getDebugRefetchOptions } from "@/lib/refetchDebug";
import { useExamType } from "@/hooks/useExamType";

import {
  useGetDailySummaryQuery,
  useGetDashboardSummaryQuery,
  useGetHabitsQuery,
  useGetTaskMetricsQuery,
  useGetWeeklyReviewQuery,
  useGetWeeklyTrendsQuery,
} from "@repo/store";
import { useEffect, useMemo, useState } from "react";

export default function AnalyticsPage() {
  const examType = useExamType();
  const [pastDays] = useState("1");
  const [reviewDays, setReviewDays] = useState("7");
  const numericReviewDays = Number(reviewDays);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetDailySummaryQuery(pastDays);

  const {
    data: dashboardData,
    isLoading: isDashLoading,
    isError: isDashError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardSummaryQuery(
    { leakageDays: parseInt(pastDays) || 7, peakDays: 30 }
  );

  const {
    data: weeklyReviewData,
    isLoading: isWeeklyReviewLoading,
    isFetching: isWeeklyReviewFetching,
  } = useGetWeeklyReviewQuery({ days: numericReviewDays, examType });

  const {
    data: reviewDashboardData,
    isLoading: isReviewDashboardLoading,
    isError: isReviewDashboardError,
    error: reviewDashboardError,
    refetch: refetchReviewDashboard,
  } = useGetDashboardSummaryQuery(
    { leakageDays: numericReviewDays, peakDays: 30 },
    getDebugRefetchOptions('analytics.weeklyReview.dashboardSummary', 60000)
  );

  const {
    data: weeklyTrendsData,
    isLoading: isWeeklyTrendsLoading,
    isError: isWeeklyTrendsError,
    error: weeklyTrendsError,
    refetch: refetchWeeklyTrends,
  } = useGetWeeklyTrendsQuery(
    undefined,
    getDebugRefetchOptions('analytics.weeklyReview.weeklyTrends', 60000)
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
    if (reviewDashboardError) {
      reportApiError(getApiErrorReportStatus(reviewDashboardError), 'getDashboardSummary', reviewDashboardError);
    }
  }, [reviewDashboardError]);

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

  useEffect(() => {
    if (weeklyTrendsError) {
      reportApiError(getApiErrorReportStatus(weeklyTrendsError), 'getWeeklyTrends', weeklyTrendsError);
    }
  }, [weeklyTrendsError]);

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

  const retryAll = () => {
    void Promise.allSettled([
      refetchSummary(),
      refetchDashboard(),
      refetchTaskMetrics(),
      refetchHabits(),
    ]);
  };

  const reviewFailedPanels = [
    isReviewDashboardError && !reviewDashboardData ? 'dashboard summary' : null,
    isWeeklyTrendsError && !weeklyTrendsData ? 'weekly trends' : null,
  ].filter((value): value is string => Boolean(value));

  const retryWeeklyReview = () => {
    void Promise.allSettled([refetchReviewDashboard(), refetchWeeklyTrends()]);
  };

  return (
    <div className="space-y-8">
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
          <WeeklyReviewSection
            reviewDays={reviewDays}
            setReviewDays={setReviewDays}
            reviewData={weeklyReviewData}
            reviewLoading={isWeeklyReviewLoading}
            reviewFetching={isWeeklyReviewFetching}
            dashboardData={reviewDashboardData}
            dashboardLoading={isReviewDashboardLoading}
            trendsData={weeklyTrendsData}
            trendsLoading={isWeeklyTrendsLoading}
            failedPanels={reviewFailedPanels}
            onRetry={retryWeeklyReview}
          />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 min-w-0">
              <FocusTrends pastDays={pastDays} data={weeklyTrendsData?.data} isLoading={isWeeklyTrendsLoading} />
            </div>
            <div className="min-w-0">
              <SessionBreakdown pastDays={pastDays} summaryStats={summaryData?.stats} isLoading={isSummaryLoading && !summaryData} />
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

          <WeeklyReviewDetailCards
            reviewData={weeklyReviewData}
            reviewLoading={isWeeklyReviewLoading}
          />
        </>
      )}
    </div>
  );
}
