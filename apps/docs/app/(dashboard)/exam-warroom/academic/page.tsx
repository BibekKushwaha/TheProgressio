import { GPACalculator } from "@/components/analytics/GPACalculator";
import { GradeEntryManager } from "@/components/analytics/GradeEntryManager";
import { PredictiveScoreCard } from "@/components/analytics/PredictiveScoreCard";

export default function AnalyticsAcademicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
      <div className="flex">
        <div className="flex-1 flex flex-col">
          
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-8">
             
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <GradeEntryManager />
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                      <PredictiveScoreCard />
                    </div>
                  </div>
                  {/* <SWOTAnalysis /> */}
                  <GPACalculator />
                  
                </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
