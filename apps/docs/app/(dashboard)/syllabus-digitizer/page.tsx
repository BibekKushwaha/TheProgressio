import React from 'react';
import { NLPCommandBar } from '@/components/planner/NLPCommandBar';
import { SyllabusDigitizer } from '@/components/planner/SyllabusDigitizer';

export default function SyllabusDigitizerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white">
      <div className="flex-1 flex flex-col">
        <div className="px-4 md:px-8 pt-4 space-y-4">
          <NLPCommandBar />
          <SyllabusDigitizer />
        </div>
      </div>
    </div>
  );
}
