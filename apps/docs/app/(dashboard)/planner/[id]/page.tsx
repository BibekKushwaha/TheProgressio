// app/task/[id]/page.tsx
import { SingleTaskHeader } from '@/components/planner/SingleTaskHeader';
import { DescriptionCard } from '@/components/planner/DescriptionCard';
import { TaskInfoPanel } from '@/components/planner/TaskInfoPanel';
import { FocusHistory } from '@/components/planner/FocusHistory';
import { AttachmentsList } from '@/components/planner/Attachment';
import { StartFocusButton } from '@/components/planner/StatFocusButton';
import { TaskEfficiencyPanel } from '@/components/planner/TaskEfficiencyPanel';

export default function TaskDetailsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white">
            <div className="flex">
                <div className="flex-1 flex flex-col">
                    <main className="flex-1 p-4 md:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                            <SingleTaskHeader />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
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
                        </div>
                    </main>

                    <StartFocusButton />
                </div>
            </div>
        </div>
    );
}