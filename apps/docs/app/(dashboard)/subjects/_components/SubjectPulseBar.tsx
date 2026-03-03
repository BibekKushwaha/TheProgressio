'use client';

import { BarChart3 } from 'lucide-react';

export interface SubjectPulseEntry {
  id: string;
  name: string;
  total: number;
  completion: number;
}

interface SubjectPulseBarProps {
  subjectPulse: SubjectPulseEntry[];
}

export function SubjectPulseBar({ subjectPulse }: SubjectPulseBarProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-cyan-300" />
        Learning Pulse
      </h2>
      {subjectPulse.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No subject activity yet.</p>
      ) : (
        <div className="space-y-3">
          {subjectPulse.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm text-white truncate">{entry.name}</p>
                  <span className="text-xs text-slate-400">{entry.completion}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    style={{ width: `${Math.max(8, entry.completion)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-300">{entry.total} tasks</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
