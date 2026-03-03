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
  useGetDailySummaryQuery,
  useGetDashboardSummaryQuery,
  useGetHabitsQuery,
  useGetTaskMetricsQuery,
} from "@repo/store";
import { useMemo, useState } from "react";

export default function AnalyticsOverviewPage() {
  const [pastDays, setPastDays] = useState("1");

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching
  } = useGetDailySummaryQuery(pastDays);

  // BFF replaces useGetFocusScoreQuery — gets score+breakdown in the same
  // request as leakage/peak, so no extra round-trip on page load.
  const {
    data: dashboardData,
    isLoading: isDashLoading,
    isFetching: isDashFetching
  } = useGetDashboardSummaryQuery(
    { leakageDays: parseInt(pastDays) || 7, peakDays: 30 }
  );

  // Lightweight count-only endpoint — no full task rows transferred.
  const {
    data: taskMetricsData,
    isLoading: isTaskMetricsLoading,
  } = useGetTaskMetricsQuery(undefined);

  const {
    data: habitsResponse,
    isLoading: isHabitsLoading
  } = useGetHabitsQuery(undefined);

  const habits = useMemo(() => habitsResponse?.habits || [], [habitsResponse]);

  // Use server-computed metrics directly — avoids fetching 500 task objects client-side.
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
        trendDirection: (hours > 0 ? 'up' : 'neutral') as 'up' | 'neutral' | 'down',
        icon: Clock,
        gradient: 'from-cyan-500 to-blue-500',
        isLoading: isSummaryLoading && !summaryData
      },
      {
        label: `${timeLabel} Completion`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-12 bg-white/10" /> : `${summaryData?.stats?.totalTasksCompleted ?? 0}`,
        trend: "Tasks",
        trendDirection: ((summaryData?.stats?.totalTasksCompleted ?? 0) > 0 ? 'up' : 'neutral') as 'up' | 'neutral' | 'down',
        icon: CheckCircle,
        gradient: 'from-purple-500 to-pink-500',
        isLoading: isSummaryLoading && !summaryData
      },
      {
        label: 'Overall Focus Score',
        value: isDashMissing ? <Skeleton className="h-8 w-24 bg-white/10" /> : `${scoreDisplay}/100`,
        trend: focusScore >= 80 ? "Excellent" : focusScore >= 60 ? "Good" : "Steady",
        trendDirection: (focusScore >= 80 ? 'up' : focusScore >= 50 ? 'neutral' : 'down') as 'up' | 'neutral' | 'down',
        icon: Target,
        gradient: 'from-green-500 to-emerald-500',
        isLoading: isDashLoading && !dashboardData
      },
      {
        label: `${isWeekly ? 'Weekly' : 'Daily'} Target`,
        value: isSummaryMissing ? <Skeleton className="h-8 w-16 bg-white/10" /> : `${progress}%`,
        trend: "Progress",
        trendDirection: (progress >= 80 ? 'up' : progress >= 50 ? 'neutral' : 'down') as 'up' | 'neutral' | 'down',
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


    </div>
  );
}
