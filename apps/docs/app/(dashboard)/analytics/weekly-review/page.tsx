"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorReportStatus } from "@/lib/api-error";
import { reportApiError } from "@/lib/errorReporter";
import { getDebugRefetchOptions } from "@/lib/refetchDebug";
import { useGetDashboardSummaryQuery, useGetWeeklyReviewQuery, useGetWeeklyTrendsQuery } from "@repo/store";
import { AlertTriangle, Award, CheckCircle2, RefreshCcw, Target, TrendingUp, Clock } from "lucide-react";
import { formatRelativeDate } from "@/lib/date";
import { useExamType } from "@/hooks/useExamType";

const WeeklyReportCharts = dynamic(
  () => import("@/components/analytics/WeeklyReportCharts").then((m) => ({ default: m.WeeklyReportCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-80 rounded-xl bg-white/5" />
        ))}
      </div>
    ),
  }
);

export default function WeeklyReviewPage() {
  const examType = useExamType();
  const [days, setDays] = useState<string>("7");
  const numericDays = Number(days);
  const { data, isLoading, isFetching } = useGetWeeklyReviewQuery({ days: numericDays, examType });
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardSummaryQuery(
    { leakageDays: numericDays, peakDays: 30 },
    getDebugRefetchOptions('weeklyReview.dashboardSummary', 60000)
  );
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
    isError: isTrendsError,
    error: trendsError,
    refetch: refetchTrends,
  } = useGetWeeklyTrendsQuery(
    undefined,
    getDebugRefetchOptions('weeklyReview.weeklyTrends', 60000)
  );

  const adjustment = data?.adjustment ?? "";

  const insights = (data?.insights ?? []) as { title: string; detail: string }[];
  const priorities = (data?.priorities ?? []) as { type: string; title: string; dueDate?: string }[];
  const isEmptyWeeklyReview = !isLoading && insights.length === 0 && priorities.length === 0 && !adjustment;

  useEffect(() => {
    if (dashboardError) {
      reportApiError(getApiErrorReportStatus(dashboardError), 'getDashboardSummary', dashboardError);
    }
  }, [dashboardError]);

  useEffect(() => {
    if (trendsError) {
      reportApiError(getApiErrorReportStatus(trendsError), 'getWeeklyTrends', trendsError);
    }
  }, [trendsError]);

  const headerSubtitle = useMemo(() => {
    if (!data) return "A 5-minute review to reduce overload and decide what to do next.";
    return `From ${data.from.slice(0, 10)} → ${data.to.slice(0, 10)} · Exam type: ${data.examType}`;
  }, [data]);

  const weeklyData = Array.isArray(trendsData?.data)
    ? trendsData.data.map((item: { day?: string; date?: string; hours?: number; tasks?: number }) => ({
        day: item.day ?? item.date ?? "N/A",
        hours: Number(item.hours ?? 0),
        tasks: Number(item.tasks ?? 0),
      }))
    : [];

  const categoryData = dashboardData?.focus?.breakdown ? [
    { category: "Consistency", value: dashboardData.focus.breakdown.consistency * 2.5 },
    { category: "Intensity", value: dashboardData.focus.breakdown.intensity * 3.3 },
    { category: "Depth", value: dashboardData.focus.breakdown.depth * 3.3 },
    { category: "Efficiency", value: dashboardData.focus.score },
    { category: "Balance", value: 75 },
  ] : [];

  const weeklyTasksCompleted = weeklyData.reduce(
    (sum: number, day: { tasks?: number }) => sum + (day.tasks || 0),
    0
  );

  const reportStats = {
    totalHours: Math.round(((dashboardData?.focus?.totalMinutes ?? 0) / 60) * 10) / 10,
    tasksCompleted: weeklyTasksCompleted,
    avgFocus: dashboardData?.focus?.avgHoursPerDay ?? 0,
    streak: dashboardData?.streak ?? 0,
  };

  const failedPanels = [
    isDashboardError && !dashboardData ? 'dashboard summary' : null,
    isTrendsError && !trendsData ? 'weekly trends' : null,
  ].filter((value): value is string => Boolean(value));

  const retryReport = () => {
    void Promise.allSettled([refetchDashboard(), refetchTrends()]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Review"
        subtitle={headerSubtitle}
      />

      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Window</CardTitle>
          <div className="w-[160px]">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="21">Last 21 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {isFetching && <span>Refreshing…</span>}
        </CardContent>
      </Card>

      {failedPanels.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <p>
                Your weekly snapshot is using partial data because {failedPanels.join(' and ')} {failedPanels.length === 1 ? 'is' : 'are'} temporarily unavailable.
              </p>
            </div>
            <button
              onClick={retryReport}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry snapshot
            </button>
          </div>
        </div>
      ) : null}

      {isEmptyWeeklyReview ? (
        <AnalyticsEmptyState
          title="Weekly review appears after you build a little study history"
          description="Finish a few tasks or focus sessions and this screen will start surfacing what worked, what slipped, and what deserves attention next week."
          primaryHref="/createtask"
          primaryLabel="Plan this week"
          secondaryHref="/dashboard"
          secondaryLabel="Back to dashboard"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card variant="glass" className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <div className="text-sm text-slate-400">Total Hours</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {isDashboardLoading ? <Skeleton className="h-9 w-20" /> : `${reportStats.totalHours}h`}
              </div>
              <div className="text-xs text-slate-400 mt-1">This period</div>
            </Card>
            <Card variant="glass" className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-violet-400" />
                <div className="text-sm text-slate-400">Tasks Completed</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {isTrendsLoading ? <Skeleton className="h-9 w-16" /> : reportStats.tasksCompleted}
              </div>
              <div className="text-xs text-slate-400 mt-1">This period</div>
            </Card>
            <Card variant="glass" className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div className="text-sm text-slate-400">Avg Daily Focus</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {isDashboardLoading ? <Skeleton className="h-9 w-16" /> : `${reportStats.avgFocus}h`}
              </div>
              <div className="text-xs text-slate-400 mt-1">Per day</div>
            </Card>
            <Card variant="glass" className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-orange-400" />
                <div className="text-sm text-slate-400">Streak Maintained</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {isDashboardLoading ? <Skeleton className="h-9 w-20" /> : `${reportStats.streak} Days`}
              </div>
              <div className="text-xs text-orange-400 mt-1">{reportStats.streak > 0 ? 'Keep it up!' : 'Start your streak today!'}</div>
            </Card>
          </div>

          {weeklyData.length > 0 || categoryData.length > 0 ? (
            <WeeklyReportCharts weeklyData={weeklyData} categoryData={categoryData} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-200 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Snapshot charts are temporarily unavailable</h2>
              <p className="mt-2 text-sm text-slate-300">
                We could not load enough weekly data to build the charts right now. Retry the snapshot in a moment.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(isLoading ? Array.from({ length: 3 }) : insights).map((item, idx: number) => (
              <Card key={isLoading ? idx : (item as { title: string }).title} variant="glass">
                <CardHeader>
                  <CardTitle className="text-base">
                    {isLoading ? <Skeleton className="h-4 w-24" /> : (item as { title: string }).title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">{(item as { detail: string }).detail}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-indigo-400" />
                <CardTitle>Top 3 Priorities</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : priorities.length === 0 ? (
                <p className="text-sm text-slate-400">No priorities found. You’re clear—pick one focused practice block today.</p>
              ) : (
                <div className="space-y-2">
                  {priorities.map((p: { title: string; type: string; dueDate?: string }, i: number) => (
                    <div
                      key={p.title || i}
                      className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      {p.type === "TASK" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm text-slate-200 font-medium">{p.title}</div>
                        {p.dueDate && (
                          <div className="text-xs text-slate-500">Due: {formatRelativeDate(p.dueDate?.slice(0, 10) ?? '')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>One Adjustment</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <p className="text-sm text-slate-300">{adjustment}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
