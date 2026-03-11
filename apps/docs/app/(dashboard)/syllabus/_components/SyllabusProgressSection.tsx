'use client';

import type { SyllabusProgressResponse } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type SyllabusProgressSectionProps = {
  progress: SyllabusProgressResponse;
};

export function SyllabusProgressSection({ progress }: SyllabusProgressSectionProps) {
  const statCards = [
    { label: 'Coverage', value: `${progress.summary.coveragePercent}%`, helper: 'topics linked to at least one task' },
    { label: 'Topics', value: String(progress.summary.totalTopics), helper: 'total syllabus topics in this subject' },
    { label: 'Linked', value: String(progress.summary.linkedTopics), helper: 'topics already attached to planner tasks' },
    { label: 'Completed', value: String(progress.summary.completedTopics), helper: 'topics with at least one completed task' },
  ];

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Coverage Progress</CardTitle>
        <CardDescription>Track how much of this syllabus is linked to active work and how much is already completed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{stat.value}</div>
              <div className="mt-1 text-xs text-slate-400">{stat.helper}</div>
            </div>
          ))}
        </div>

        {progress.chapters.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-white">By chapter</div>
            <div className="grid gap-3 md:grid-cols-2">
              {progress.chapters.map((chapter) => (
                <div key={chapter.chapter} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{chapter.chapter}</div>
                      <div className="text-xs text-slate-400">
                        {chapter.linkedTopics}/{chapter.totalTopics} linked, {chapter.completedTopics} completed
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-indigo-300">{chapter.coveragePercent}%</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${chapter.coveragePercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
