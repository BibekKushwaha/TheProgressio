// components/planner/TaskInfoPanel.tsx
'use client'
import { Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
    useGetSyllabusTopicsQuery,
    useGetTaskSyllabusTopicsQuery,
    useSetTaskSyllabusTopicsMutation,
} from '@repo/store';
import { Button } from '@/components/ui/button';
import { useTaskDetail } from './TaskDetailContext';

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
    const { task } = useTaskDetail();
    const categoryId = task?.categoryId ?? null;

    const { data: topicsData } = useGetSyllabusTopicsQuery(
        categoryId ? { categoryId } : undefined
    );
    const { data: linksData } = useGetTaskSyllabusTopicsQuery(task?.id ?? '', { skip: !task?.id });
    const [setLinks, { isLoading: isSavingLinks }] = useSetTaskSyllabusTopicsMutation();

    const topics = useMemo(
        () => (topicsData?.topics ?? []) as Array<{ id: string; chapter: string; title: string }>,
        [topicsData?.topics]
    );
    const existingTopicIds = useMemo(
        () => new Set((linksData?.links ?? []).map((l: { topicId: string }) => l.topicId)),
        [linksData]
    );
    const groupedTopics = useMemo(() => {
        const map = new Map<string, Array<{ id: string; chapter: string; title: string }>>();
        for (const topic of topics) {
            const chapter = topic.chapter || 'General';
            if (!map.has(chapter)) map.set(chapter, []);
            map.get(chapter)?.push(topic);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [topics]);

    // Track user's checkbox changes locally as a Map<topicId, wantsChecked>.
    // The final selected set is derived from server state + local overrides,
    // eliminating the useState+useEffect double-render pattern.
    const [localToggles, setLocalToggles] = useState<Map<string, boolean>>(new Map());

    const selectedTopicIds = useMemo(() => {
        const result = new Set(existingTopicIds);
        for (const [id, on] of localToggles) {
            if (on) result.add(id);
            else result.delete(id);
        }
        return result;
    }, [existingTopicIds, localToggles]);

    const timeRemaining = useMemo(() => calculateTimeRemaining(task?.dueDate), [task?.dueDate]);
    const isOverdue = timeRemaining === 'Overdue';

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
                        <div className="text-right">
                            <div className="text-xs text-slate-400">
                                {selectedTopicIds.size} linked topic{selectedTopicIds.size === 1 ? '' : 's'}
                            </div>
                            <Link href="/syllabus" className="text-xs text-indigo-300 hover:text-indigo-200">
                                Manage syllabus →
                            </Link>
                        </div>
                    </div>

                    {topics.length === 0 ? (
                        <div className="space-y-2 text-xs text-slate-500">
                            <div>No topics defined for this subject yet.</div>
                            <Link href="/createtask?mode=syllabus" className="text-indigo-300 hover:text-indigo-200">
                                Import syllabus topics →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {groupedTopics.slice(0, 4).map(([chapter, chapterTopics]) => (
                                <div key={chapter} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                                    <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{chapter}</div>
                                    <div className="space-y-2">
                                        {chapterTopics.slice(0, 4).map((topic) => {
                                            const checked = selectedTopicIds.has(topic.id);
                                            return (
                                                <label key={topic.id} className="flex items-center gap-2 text-sm text-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setLocalToggles((prev) => {
                                                                const next = new Map(prev);
                                                                const serverHas = existingTopicIds.has(topic.id);
                                                                const currentlyChecked = checked;
                                                                if (currentlyChecked === serverHas) {
                                                                    next.set(topic.id, !currentlyChecked);
                                                                } else {
                                                                    next.delete(topic.id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                    <span>{topic.title}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

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
