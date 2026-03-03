'use client';

import { FolderKanban, CheckCircle2, Clock3, Sparkles } from 'lucide-react';

interface SubjectOverviewStatsProps {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    activeSubjects: number;
    completionRate: number;
  };
}

export function SubjectOverviewStats({ overview }: SubjectOverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Total Tasks</p>
          <FolderKanban className="w-4 h-4 text-cyan-300" />
        </div>
        <p className="text-3xl font-bold mt-3">{overview.totalTasks}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Completion Rate</p>
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
        </div>
        <p className="text-3xl font-bold mt-3">{overview.completionRate}%</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">In Progress</p>
          <Clock3 className="w-4 h-4 text-amber-300" />
        </div>
        <p className="text-3xl font-bold mt-3">{overview.inProgressTasks}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Active Subjects</p>
          <Sparkles className="w-4 h-4 text-violet-300" />
        </div>
        <p className="text-3xl font-bold mt-3">{overview.activeSubjects}</p>
      </div>
    </div>
  );
}
