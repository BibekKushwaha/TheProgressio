'use client';

import { AlertTriangle } from 'lucide-react';

interface SubjectRiskPanelProps {
  highlights: string[];
  completionRate: number;
}

export function SubjectRiskPanel({ highlights, completionRate }: SubjectRiskPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-300" />
          Subject Risk Radar
        </h2>
        <span
          className={`px-2.5 py-1 rounded-full text-xs border ${
            completionRate < 60
              ? 'bg-red-500/15 border-red-400/30 text-red-200'
              : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
          }`}
        >
          {completionRate < 60 ? 'Attention' : 'Stable'}
        </span>
      </div>
      <div className="space-y-3">
        {highlights.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
