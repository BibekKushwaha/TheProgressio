"use client";

import { WeeklyReviewPriority, WeeklyReviewResponse, DashboardSummaryResponse } from "@repo/store";
import { AlertTriangle, Award, CheckCircle2, Clock, RefreshCcw, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRelativeDate } from "@/lib/date";

interface WeeklyTrendPoint {
  day?: string;
  date?: string;
  hours?: number;
  tasks?: number;
}

interface WeeklyReviewSectionProps {
  reviewDays: string;
  setReviewDays: (value: string) => void;
  reviewData?: WeeklyReviewResponse;
  reviewLoading: boolean;
  reviewFetching: boolean;
  dashboardData?: DashboardSummaryResponse;
  dashboardLoading: boolean;
  trendsData?: { message: string; data: WeeklyTrendPoint[] };
  trendsLoading: boolean;
  failedPanels: string[];
  onRetry: () => void;
}

interface WeeklyReviewDetailCardsProps {
  reviewData?: WeeklyReviewResponse;
  reviewLoading: boolean;
}

export function WeeklyReviewDetailCards({ reviewData, reviewLoading }: WeeklyReviewDetailCardsProps) {
  const priorities = reviewData?.priorities ?? [];
  const adjustment = reviewData?.adjustment ?? "";

  return (
    <>
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-indigo-400" />
            <CardTitle>Top 3 Priorities</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : priorities.length === 0 ? (
            <p className="text-sm text-slate-400">No priorities found. You’re clear—pick one focused practice block today.</p>
          ) : (
            <div className="space-y-2">
              {priorities.map((priority: WeeklyReviewPriority, index: number) => (
                <div
                  key={priority.title || index}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  {priority.type === "TASK" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-200">{priority.title}</div>
                    {priority.dueDate ? (
                      <div className="text-xs text-slate-500">Due: {formatRelativeDate(priority.dueDate.slice(0, 10))}</div>
                    ) : null}
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
          {reviewLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <p className="text-sm text-slate-300">{adjustment}</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function WeeklyReviewSection({
  reviewDays,
  setReviewDays,
  reviewData,
  reviewLoading,
  reviewFetching,
  dashboardData,
  dashboardLoading,
  trendsData,
  trendsLoading,
  failedPanels,
  onRetry,
}: WeeklyReviewSectionProps) {
  const insights = reviewData?.insights ?? [];
  const priorities = reviewData?.priorities ?? [];
  const adjustment = reviewData?.adjustment ?? "";
  const isEmptyWeeklyReview = !reviewLoading && insights.length === 0 && priorities.length === 0 && !adjustment;

  const weeklyTasksCompleted = Array.isArray(trendsData?.data)
    ? trendsData.data.reduce((sum, item) => sum + Number(item.tasks ?? 0), 0)
    : 0;
  const reportStats = {
    totalHours: Math.round(((dashboardData?.focus?.totalMinutes ?? 0) / 60) * 10) / 10,
    tasksCompleted: weeklyTasksCompleted,
    avgFocus: dashboardData?.focus?.avgHoursPerDay ?? 0,
    streak: dashboardData?.streak ?? 0,
  };

  return (
    <section id="weekly-review" className="space-y-6 scroll-mt-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Weekly Review</h2>
          <p className="text-sm md:text-base font-medium text-slate-400">
            {reviewData
              ? `From ${reviewData.from.slice(0, 10)} → ${reviewData.to.slice(0, 10)} · Exam type: ${reviewData.examType}`
              : "A 5-minute review to reduce overload and decide what to do next."}
          </p>
        </div>
        <div className="w-[170px]">
          <Select value={reviewDays} onValueChange={setReviewDays}>
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
      </div>

      {reviewFetching ? <div className="text-sm text-slate-400">Refreshing…</div> : null}

      {failedPanels.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <p>
                Your weekly snapshot is using partial data because {failedPanels.join(" and ")} {failedPanels.length === 1 ? "is" : "are"} temporarily unavailable.
              </p>
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry snapshot
            </button>
          </div>
        </div>
      ) : null}

      {isEmptyWeeklyReview ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Weekly review appears after you build a little study history</h3>
          <p className="mt-2 text-sm text-slate-400">
            Finish a few tasks or focus sessions and this section will start surfacing what worked, what slipped, and what deserves attention next week.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card variant="glass" className="gap-2 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <div className="text-sm text-slate-400">Total Hours</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {dashboardLoading ? <Skeleton className="h-9 w-20" /> : `${reportStats.totalHours}h`}
              </div>
              <div className="text-xs text-slate-400 mt-1">This period</div>
            </Card>
            <Card variant="glass" className="gap-2 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-violet-400" />
                <div className="text-sm text-slate-400">Tasks Completed</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {trendsLoading ? <Skeleton className="h-9 w-16" /> : reportStats.tasksCompleted}
              </div>
              <div className="text-xs text-slate-400 mt-1">This period</div>
            </Card>
            <Card variant="glass" className="gap-2 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div className="text-sm text-slate-400">Avg Daily Focus</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {dashboardLoading ? <Skeleton className="h-9 w-16" /> : `${reportStats.avgFocus}h`}
              </div>
              <div className="text-xs text-slate-400 mt-1">Per day</div>
            </Card>
            <Card variant="glass" className="gap-2 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-orange-400" />
                <div className="text-sm text-slate-400">Streak Maintained</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {dashboardLoading ? <Skeleton className="h-9 w-20" /> : `${reportStats.streak} Days`}
              </div>
              <div className="text-xs text-orange-400 mt-1">{reportStats.streak > 0 ? "Keep it up!" : "Start your streak today!"}</div>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
