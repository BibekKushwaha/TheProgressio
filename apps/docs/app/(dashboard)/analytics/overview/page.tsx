"use client";
import { ActivityHeatmap } from "@/components/analytics/ActivityHeatMap";
import { AnalyticsHeader } from "@/components/analytics/AnalyticHeader";
import { FocusTrends } from "@/components/analytics/FocusTrend";
import { SessionBreakdown } from "@/components/analytics/SessionBreakdown";
import { StatCards } from "@/components/analytics/StatCard";
import { useGetDailySummaryQuery, useGetFocusScoreQuery, useGetWeeklyTrendsQuery } from "@repo/store";
import { useState } from "react";

export default function AnalyticsOverviewPage() {
  const [pastDays, setPastDays] = useState("1");
  const selectedPredictionTaskId = "";
  const { data: summaryData } = useGetDailySummaryQuery(pastDays);
  const { data: focusScoreData } = useGetFocusScoreQuery();
  const { data: trendsData } = useGetWeeklyTrendsQuery();

  const handleExportReport = () => {
    const generatedAt = new Date();
    const payload = {
      generatedAt: generatedAt.toISOString(),
      filters: {
        pastDays,
        selectedPredictionTaskId: selectedPredictionTaskId || null,
      },
      summary: summaryData?.stats ?? null,
      focusScore: focusScoreData?.stats ?? null,
      weeklyTrends: trendsData?.data ?? [],
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-report-${
      generatedAt.toISOString().split("T")[0] || "report"
    }.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

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
            <div className="max-w-7xl mx-auto space-y-8">
            

              
                <div className="space-y-6">
                  <StatCards pastDays={pastDays} />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <FocusTrends pastDays={pastDays} />
                    </div>
                    <div>
                      <SessionBreakdown pastDays={pastDays} />
                    </div>
                  </div>
                  <ActivityHeatmap pastDays={pastDays} />
                </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

