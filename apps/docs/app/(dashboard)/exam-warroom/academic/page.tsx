import { GPACalculator } from "@/components/analytics/GPACalculator";
import { GradeEntryManager } from "@/components/analytics/GradeEntryManager";
import { PredictiveScoreCard } from "@/components/analytics/PredictiveScoreCard";

export default function AnalyticsAcademicPage() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GradeEntryManager />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <PredictiveScoreCard />
        </div>
      </div>
      <GPACalculator />
    </div>
  );
}
