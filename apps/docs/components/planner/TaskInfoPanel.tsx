// components/task/TaskInfoPanel.tsx
'use client'
import { Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    useGetTaskByIdQuery,
    useGetSyllabusTopicsQuery,
    useGetTaskSyllabusTopicsQuery,
    useSetTaskSyllabusTopicsMutation,
} from '@repo/store';
import { Button } from '@/components/ui/button';
import { useTaskRouteId } from '@/hooks/useTaskRouteId';

function formatDueDate(dueDate?: string | null) {
    if (!dueDate) return "No due date";

    const date = new Date(dueDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays =
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1 && diffDays <= 7) return "Next week";

    // fallback
    return target.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function calculateTimeRemaining(dueDate?: string | null) {
    if (!dueDate) return "N/A";

    const now = new Date();
    const target = new Date(dueDate);
    const diffMs = target.getTime() - now.getTime();

    if (diffMs < 0) return "Overdue";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h`;
    }
    if (diffHours > 0) {
        return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
}

export function TaskInfoPanel() {
    const taskId = useTaskRouteId();
    const { data: task } = useGetTaskByIdQuery(taskId || '', { skip: !taskId });
    const categoryId = task?.categoryId ?? null;

    const { data: topicsData } = useGetSyllabusTopicsQuery(
        categoryId ? { categoryId } : undefined
    );
    const { data: linksData } = useGetTaskSyllabusTopicsQuery(task?.id ?? '', { skip: !task?.id });
    const [setLinks, { isLoading: isSavingLinks }] = useSetTaskSyllabusTopicsMutation();

    const topics = (topicsData?.topics ?? []) as Array<{ id: string; chapter: string; title: string }>;
    const existingTopicIds = useMemo(
        () => new Set((linksData?.links ?? []).map((l: { topicId: string }) => l.topicId)),
        [linksData]
    );

    const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setSelectedTopicIds(new Set(Array.from(existingTopicIds)));
    }, [existingTopicIds]);

    const timeRemaining = calculateTimeRemaining(task?.dueDate);
    const isOverdue = timeRemaining === "Overdue";

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Task Info</h2>

            <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Calendar className="w-5 h-5" />
                        <span>Due Date</span>
                    </div>
                    <div className="font-semibold text-right">
                        <div className={isOverdue ? "text-red-400" : ""}>{formatDueDate(task?.dueDate)}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Clock className="w-5 h-5" />
                        <span>Time Remaining</span>
                    </div>
                    <div className={`font-semibold ${isOverdue ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}>
                        {timeRemaining}
                    </div>
                </div>

                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 text-slate-400">
                        <User className="w-5 h-5" />
                        <span>Assigned to</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-sm">
                            AS
                        </div>
                        <span className="font-semibold">You</span>
                    </div>
                </div>
            </div>

            {categoryId && (
                <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-white">Curriculum Links</div>
                            <div className="text-xs text-slate-400">
                                Link this task to syllabus topics for better AI breakdowns.
                            </div>
                        </div>
                        <Link href="/syllabus" className="text-xs text-indigo-300 hover:text-indigo-200">
                            Manage syllabus →
                        </Link>
                    </div>

                    {topics.length === 0 ? (
                        <div className="text-xs text-slate-500">
                            No topics defined for this subject yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {topics.slice(0, 12).map((topic) => {
                                const checked = selectedTopicIds.has(topic.id);
                                return (
                                    <label key={topic.id} className="flex items-center gap-2 text-sm text-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                                setSelectedTopicIds((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(topic.id)) next.delete(topic.id);
                                                    else next.add(topic.id);
                                                    return next;
                                                });
                                            }}
                                        />
                                        <span className="text-slate-400 text-xs">{topic.chapter}:</span>
                                        <span>{topic.title}</span>
                                    </label>
                                );
                            })}

                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    disabled={isSavingLinks || !task?.id}
                                    onClick={async () => {
                                        if (!task?.id) return;
                                        await setLinks({
                                            taskId: task.id,
                                            topicIds: Array.from(selectedTopicIds),
                                        }).unwrap();
                                    }}
                                >
                                    {isSavingLinks ? 'Saving…' : 'Save links'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
