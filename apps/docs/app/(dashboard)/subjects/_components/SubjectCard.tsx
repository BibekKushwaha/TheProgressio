'use client';

import { ChevronRight } from 'lucide-react';

export interface SubjectStats {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
}

interface SubjectCardProps {
  subject: {
    id: string;
    name: string;
    colorCode?: string | null;
    icon?: string | null;
  };
  stats: SubjectStats;
  isSelected: boolean;
  onClick: () => void;
}

export function SubjectCard({ subject, stats, isSelected, onClick }: SubjectCardProps) {
  const color = subject.colorCode || '#6366f1';
  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`text-left bg-white/5 backdrop-blur-md border-2 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
        isSelected ? 'shadow-lg scale-[1.02]' : 'border-white/10 hover:border-white/20'
      }`}
      style={{
        borderColor: isSelected ? color : undefined,
        boxShadow: isSelected ? `0 0 30px ${color}30` : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: `${color}30`, color }}
          >
            {subject.icon || subject.name[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{subject.name}</h3>
            <p className="text-sm text-slate-400">{stats.total} tasks tracked</p>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Completion</span>
          <span className="text-white font-semibold">{completionPct}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-emerald-300 text-center">
          {stats.done} done
        </div>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-amber-300 text-center">
          {stats.inProgress} live
        </div>
        <div className="rounded-lg bg-slate-500/20 border border-white/10 px-2 py-1 text-slate-300 text-center">
          {stats.pending} queued
        </div>
      </div>
    </button>
  );
}
