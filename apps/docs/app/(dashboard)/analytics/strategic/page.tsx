'use client';
import dynamic from 'next/dynamic';
import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { GlassHero } from '@/components/layout/GlassHero';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskStatus, useGetTasksQuery, useGetStrategicSummaryQuery } from "@repo/store";
import { BrainCircuit, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useExamType } from "@/hooks/useExamType";

// Dynamically import recharts-heavy components and large analytics cards.
// Keeps them out of the initial bundle; loaded on demand after navigation.
const CycleTimeScatterPlot = dynamic(
  () => import('@/components/analytics/CycleTimeScatterPlot').then((m) => ({ default: m.CycleTimeScatterPlot })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);
const PeakProductivityCard = dynamic(
  () => import('@/components/analytics/PeakProductivityCard').then((m) => ({ default: m.PeakProductivityCard })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);
const TimeLeakageCard = dynamic(
  () => import('@/components/analytics/TimeLeakageCard').then((m) => ({ default: m.TimeLeakageCard })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);
const DurationPredictionCard = dynamic(
  () => import('@/components/analytics/DurationPredictionCard').then((m) => ({ default: m.DurationPredictionCard })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);
const PredictiveScoreCard = dynamic(
  () => import('@/components/analytics/PredictiveScoreCard').then((m) => ({ default: m.PredictiveScoreCard })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);
const ProductivityInsights = dynamic(
  () => import('@/components/analytics/ProductivityInsights').then((m) => ({ default: m.ProductivityInsights })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);
const SWOTReport = dynamic(
  () => import('@/components/analytics/SWOTReport').then((m) => ({ default: m.SWOTReport })),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> },
);

export default function AnalyticsStrategicPage() {
  const examType = useExamType();
  const [selectedPredictionTaskId, setSelectedPredictionTaskId] = useState("");
  const tasksQueryArgs = useMemo(() => ({ page: 1, limit: 500 }), []);
  const { data: allTasks } = useGetTasksQuery(tasksQueryArgs);

  // Single BFF call pre-warms all 5 expensive analytics in parallel.
  // Each child component receives the result as initialData and skips its own query.
  const { data: strategicData } = useGetStrategicSummaryQuery({ examType });
  const predictionTaskOptions = useMemo(() => {
    if (!allTasks) return [];
    return [...allTasks]
      .filter(
        (task) =>
          task.status === TaskStatus.PENDING ||
          task.status === TaskStatus.IN_PROGRESS
      )
      .sort((a, b) => {
        const aTime = a.dueDate
          ? new Date(a.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate
          ? new Date(b.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [allTasks]);

  const selectedTask = useMemo(
    () =>
      predictionTaskOptions.find((task) => task.id === selectedPredictionTaskId),
    [predictionTaskOptions, selectedPredictionTaskId]
  );

  useEffect(() => {
    if (predictionTaskOptions.length === 0) {
      setSelectedPredictionTaskId("");
      return;
    }
    setSelectedPredictionTaskId((current) => {
      const exists = predictionTaskOptions.some((task) => task.id === current);
      return exists ? current : (predictionTaskOptions[0]?.id ?? "");
    });
  }, [predictionTaskOptions]);

  const isEmptyStrategic = predictionTaskOptions.length === 0;

  return (
    <div className="space-y-8">
      <GlassHero
        className="bg-gradient-to-br from-cyan-500/[0.10] via-indigo-500/[0.08] to-fuchsia-500/[0.08]"
        topGlowClassName="-top-24 -right-20 h-72 w-72 bg-cyan-500/20"
        bottomGlowClassName="-bottom-24 -left-16 h-72 w-72 bg-fuchsia-500/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs text-cyan-100 mb-4">
                      <Sparkles className="w-3.5 h-3.5" />
                      Next-Level Productivity Intelligence
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                      Analyze focus, predict duration, and optimize study outcomes
                      in one workspace.
                    </h2>
                    <p className="mt-3 text-sm md:text-base text-slate-300 max-w-2xl">
                      Switch between overview metrics, strategic predictions, and
                      academic planning tools without leaving the analytics
                      dashboard.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200 mb-3">
                      <BrainCircuit className="w-4 h-4" />
                      Smart Duration Prediction
                    </div>
                    <Select
                      value={selectedPredictionTaskId}
                      onValueChange={setSelectedPredictionTaskId}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select task for prediction" />
                      </SelectTrigger>
                      <SelectContent>
                        {predictionTaskOptions.map((task) => (
                          <SelectItem key={task.id} value={task.id} className="bg-slate-900 focus:bg-slate-400 text-white">
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-3 text-xs text-slate-300">
                      {selectedTask?.dueDate
                        ? `Due ${new Date(selectedTask.dueDate).toLocaleDateString()}`
                        : "Choose a pending/in-progress task to enable prediction."}
                    </p>
                  </div>
                </div>
              </GlassHero>



              <div className="space-y-6">
                {isEmptyStrategic ? (
                  <AnalyticsEmptyState
                    title="Strategic predictions need a few real tasks first"
                    description="This area estimates duration, reveals leakage, and highlights your best study windows. Add a pending task or start a focus session to unlock meaningful predictions."
                    primaryHref="/createtask"
                    primaryLabel="Create a task"
                    secondaryHref="/focus-session"
                    secondaryLabel="Start a focus session"
                  />
                ) : (
                  <>
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.5fr] gap-6">
                  <DurationPredictionCard
                    taskId={selectedPredictionTaskId || undefined}
                  />
                  <PredictiveScoreCard initialData={strategicData?.predictive} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PeakProductivityCard initialData={strategicData?.peak} />
                  <TimeLeakageCard initialData={strategicData?.leakage} />
                </div>
                <CycleTimeScatterPlot initialData={strategicData?.cycleTime} />
                <SWOTReport initialData={strategicData?.swot} />
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                  <ProductivityInsights
                    initialLeakage={strategicData?.leakage}
                    initialPeak={strategicData?.peak}
                    initialPredictive={strategicData?.predictive}
                    examType={examType}
                  />
                </div>
                  </>
                )}
              </div>



    </div>
  );
}
