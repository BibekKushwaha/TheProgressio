'use client';

import { useEffect, useMemo, useState } from 'react';
import { GPACalculator } from "@/components/analytics/GPACalculator";
import { GradeEntryManager } from "@/components/analytics/GradeEntryManager";
import { PredictiveScoreCard } from "@/components/analytics/PredictiveScoreCard";
import { resolveExamType } from '@/components/analytics/examWarRoomUtils';
import { useGetGradeEntriesQuery } from '@repo/store';
import { GraduationCap } from 'lucide-react';

export default function AnalyticsAcademicPage() {
  const { data: gradeEntriesData } = useGetGradeEntriesQuery();
  const inferredExamType = useMemo(
    () => resolveExamType(undefined, gradeEntriesData?.entries),
    [gradeEntriesData?.entries],
  );
  const [selectedExamType, setSelectedExamType] = useState(inferredExamType);

  useEffect(() => {
    if (!selectedExamType.trim()) {
      setSelectedExamType(inferredExamType);
    }
  }, [inferredExamType, selectedExamType]);

  const activeExamType = selectedExamType.trim() || inferredExamType;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
          <GraduationCap className="w-4 h-4 text-indigo-300" />
          Academic exam context
        </div>
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label htmlFor="academic-exam-type" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Exam type
          </label>
          <input
            id="academic-exam-type"
            value={selectedExamType}
            onChange={(event) => setSelectedExamType(event.target.value)}
            placeholder="Exam type"
            className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400/60"
          />
          <p className="text-xs text-slate-500">
            Grade entries and predictive scores stay aligned to this exam type.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <GradeEntryManager examType={activeExamType} allowExamTypeEdit={false} />
        <PredictiveScoreCard examType={activeExamType} />
      </div>
      <GPACalculator />
    </div>
  );
}
