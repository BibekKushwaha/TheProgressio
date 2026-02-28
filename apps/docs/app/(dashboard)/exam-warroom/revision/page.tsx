'use client';

import { FileSpreadsheet } from 'lucide-react';
import { RevisionScheduler } from '@/components/analytics/RevisionScheduler';
import { SubjectPerformanceSummary } from '@/components/analytics/SubjectPerformanceSummary';

export default function ExamWarRoomPage() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
                    Revision Planner
                </div>
                <RevisionScheduler />
            </div>
            {/* Subject Performance Summary */}
            {/* Subject Performance Summary */}
            <SubjectPerformanceSummary />

        </div>
    );
}
