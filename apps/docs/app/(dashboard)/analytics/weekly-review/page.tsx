"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetWeeklyReviewQuery } from "@repo/store";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react";

export default function WeeklyReviewPage() {
  const [days, setDays] = useState<string>("7");
  const { data, isLoading, isFetching } = useGetWeeklyReviewQuery({ days: Number(days), examType: "JEE" });

  const adjustment = data?.adjustment ?? "";

  const insights = (data?.insights ?? []) as { title: string; detail: string }[];
  const priorities = (data?.priorities ?? []) as { type: string; title: string; dueDate?: string }[];

  const headerSubtitle = useMemo(() => {
    if (!data) return "A 5-minute review to reduce overload and decide what to do next.";
    return `From ${data.from.slice(0, 10)} → ${data.to.slice(0, 10)} · Exam type: ${data.examType}`;
  }, [data]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(isLoading ? Array.from({ length: 3 }) : insights).map((item, idx: number) => (
          <Card key={idx} variant="glass">
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
              {priorities.slice(0, 3).map((p: { title: string; type: string; dueDate?: string }, i: number) => (
                <div
                  key={i}
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
                      <div className="text-xs text-slate-500">Due: {p.dueDate.slice(0, 10)}</div>
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
    </div>
  );
}

