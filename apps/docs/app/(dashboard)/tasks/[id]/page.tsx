import { SingleTaskHeader } from '@/components/planner/SingleTaskHeader';
import { DescriptionCard } from '@/components/planner/DescriptionCard';
import { TaskInfoPanel } from '@/components/planner/TaskInfoPanel';
import { FocusHistory } from '@/components/planner/FocusHistory';
import { AttachmentsList } from '@/components/planner/Attachment';
import { StartFocusButton } from '@/components/planner/StartFocusButton';
import { TaskEfficiencyPanel } from '@/components/planner/TaskEfficiencyPanel';
import { Sparkles } from 'lucide-react';

export default function TaskDetailsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/[0.12] via-purple-500/[0.08] to-cyan-500/[0.06] p-5 md:p-6">
                <div className="absolute -top-16 -right-12 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs text-indigo-100 mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        Task Intelligence Console
                    </div>
                    <SingleTaskHeader />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <DescriptionCard />
                    <AttachmentsList />
                </div>

                <div className="space-y-6">
                    <TaskInfoPanel />
                    <TaskEfficiencyPanel />
                    <FocusHistory />
                </div>
            </div>

            <div className="sticky bottom-6 z-30">
                <StartFocusButton />
            </div>
        </div>
    );
}
