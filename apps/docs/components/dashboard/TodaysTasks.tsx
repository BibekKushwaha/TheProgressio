"use client";

import { useMemo, memo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, CheckCircle2, Circle, GripVertical, Play } from 'lucide-react';
import { useGetTasksQuery, useToggleTaskMutation, useUpdateTaskMutation, TaskStatus, PriorityEnum, tasksApi, useAppDispatch, Task } from '@repo/store';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { EmptyTasksIllustration } from '../illustrations/EmptyTasksIllustration';

// ---------------------------------------------------------------------------
// Module-scope pure helpers — defined once, never recreated per render
// ---------------------------------------------------------------------------
const PRIORITY_RANK: Record<string, number> = {
    [PriorityEnum.HIGH]: 3,
    [PriorityEnum.MEDIUM]: 2,
    [PriorityEnum.LOW]: 1,
};

function getPriorityStyle(priority: string, status: string): string {
    if (status === TaskStatus.COMPLETED) {
        return 'text-green-400 bg-green-500/20 border-green-500/30';
    }
    switch (priority) {
        case PriorityEnum.HIGH:
            return 'text-red-400 bg-red-500/20 border-red-500/30';
        case PriorityEnum.MEDIUM:
            return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
        case PriorityEnum.LOW:
            return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
        default:
            return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return 'No time set';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// TaskItem — extracted memoized component; stable reference prevents full
// list re-renders when only one task's state changes.
// ---------------------------------------------------------------------------

interface TaskItemProps {
    task: Task;
    isTop3: boolean;
    index: number;
    onToggle: (id: string) => void;
    onUpdate: (id: string, updates: Partial<{ title: string; priority: PriorityEnum }>) => void;
    onFocus: (taskId: string, taskTitle: string) => void;
}

const TaskItem = memo(function TaskItem({ task, isTop3, index, onToggle, onUpdate, onFocus }: TaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, disabled: task.status === TaskStatus.COMPLETED });

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleVal, setTitleVal] = useState(task.title);
    const [swipeState, setSwipeState] = useState<'idle' | 'completing' | 'rescheduling'>('idle');
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            saveTitle();
        } else if (e.key === 'Escape') {
            setIsEditingTitle(false);
            setTitleVal(task.title);
        }
    };

    const saveTitle = () => {
        setIsEditingTitle(false);
        if (titleVal.trim() && titleVal !== task.title) {
            onUpdate(task.id, { title: titleVal });
        } else {
            setTitleVal(task.title);
        }
    };

    const cyclePriority = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.status === TaskStatus.COMPLETED) return;
        const order = [PriorityEnum.LOW, PriorityEnum.MEDIUM, PriorityEnum.HIGH];
        const currentIndex = order.indexOf(task.priority as PriorityEnum);
        const next = order[(currentIndex + 1) % order.length];
        onUpdate(task.id, { priority: next });
    };

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Swipe reveal layer: green = complete, purple = reschedule */}
            <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity ${swipeState === 'completing' ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
                    <CheckCircle2 className="w-5 h-5" /> Done!
                </div>
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity ${swipeState === 'rescheduling' ? 'opacity-100 text-purple-400' : 'opacity-0'}`}>
                    Reschedule <Clock className="w-5 h-5" />
                </div>
            </div>

            <motion.div
                ref={setNodeRef}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                drag={isTouchDevice && task.status !== TaskStatus.COMPLETED ? 'x' : false}
                dragDirectionLock
                dragSnapToOrigin
                dragConstraints={{ left: -120, right: 120 }}
                dragElastic={0.15}
                onDrag={(_e, info) => {
                    if (info.offset.x > 50) setSwipeState('completing');
                    else if (info.offset.x < -50) setSwipeState('rescheduling');
                    else setSwipeState('idle');
                }}
                onDragEnd={(_e, info) => {
                    if (info.offset.x > 80 && Math.abs(info.velocity.x) > 50) {
                        onToggle(task.id);
                    }
                    setSwipeState('idle');
                }}
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                    opacity: isDragging ? 0.5 : 1,
                    zIndex: isDragging ? 50 : 1,
                    ...(isDragging ? { position: 'relative' } : {})
                }}
                className={`group flex items-center gap-4 p-4 border rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 touch-pan-y ${task.status === TaskStatus.COMPLETED
                    ? 'bg-white/[0.02] border-white/5'
                    : isTop3
                        ? 'bg-gradient-to-r from-white/10 to-white/5 border-purple-500/30 shadow-sm shadow-purple-500/10'
                        : 'bg-white/5 border-white/10'
                    }`}
            >
                {task.status !== TaskStatus.COMPLETED && (
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white outline-none -ml-2 p-1">
                        <GripVertical className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity" />
                    </div>
                )}
                <button
                    onClick={() => onToggle(task.id)}
                    aria-label={task.status === TaskStatus.COMPLETED ? 'Mark task incomplete' : 'Mark task complete'}
                    className="transition-transform hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-purple-500 rounded-full"
                >
                    {task.status === TaskStatus.COMPLETED ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                        <Circle className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {isEditingTitle && task.status !== TaskStatus.COMPLETED ? (
                            <input
                                autoFocus
                                className="bg-slate-900 border border-purple-500/50 rounded-lg px-2 text-white w-full outline-none focus:ring-2 focus:ring-purple-500"
                                value={titleVal}
                                onChange={(e) => setTitleVal(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={handleKeyDown}
                            />
                        ) : (
                            <div
                                onDoubleClick={() => task.status !== TaskStatus.COMPLETED && setIsEditingTitle(true)}
                                className={`font-semibold mb-1 truncate cursor-text ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-500' : 'text-white'}`}
                                title={task.status !== TaskStatus.COMPLETED ? "Double-click to edit" : undefined}
                            >
                                {task.title}
                            </div>
                        )}
                        {isTop3 && task.status !== TaskStatus.COMPLETED && !isEditingTitle && (
                            <span className="shrink-0 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                🎯 Top {index + 1}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium tracking-wide">
                        <Clock className="w-3 h-3" />
                        {formatTime(task.dueDate)}
                    </div>
                </div>

                {task.status !== TaskStatus.COMPLETED && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFocus(task.id, task.title); }}
                        aria-label={`Start focus session for ${task.title}`}
                        title="Start Focus Session"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                    >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                )}

                <button
                    onClick={cyclePriority}
                    className={`px-2.5 py-1 border rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors ${task.status !== TaskStatus.COMPLETED ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'} ${getPriorityStyle(task.priority, task.status)}`}
                    title={task.status !== TaskStatus.COMPLETED ? "Click to cycle priority" : undefined}
                >
                    {task.status === TaskStatus.COMPLETED ? 'Done' : task.priority}
                </button>
            </motion.div>
        </div>
    );
});

export function TodaysTasks() {
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const todaysTasksQueryArgs = useMemo(() => ({ date: today }), [today]);
    const { data: tasks, isLoading } = useGetTasksQuery(todaysTasksQueryArgs);
    const [toggleTask] = useToggleTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    const dispatch = useAppDispatch();
    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        dispatch(
            tasksApi.util.updateQueryData('getTasks', todaysTasksQueryArgs, (draft) => {
                const oldIndex = draft.findIndex(t => t.id === active.id);
                const newIndex = draft.findIndex(t => t.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const item = draft[oldIndex];
                    if (item) {
                        draft.splice(oldIndex, 1);
                        draft.splice(newIndex, 0, item);
                    }
                }
            })
        );
    }, [dispatch, todaysTasksQueryArgs]);

    const handleToggle = useCallback(async (id: string) => {
        try {
            await toggleTask(id).unwrap();
        } catch (error) {
            const message = getApiErrorMessage(error, 'Failed to toggle task');
            console.warn('Failed to toggle task:', message);
        }
    }, [toggleTask]);

    const handleUpdate = useCallback(async (id: string, updates: Partial<{ title: string; priority: PriorityEnum }>) => {
        try {
            await updateTask({ id, ...updates }).unwrap();
        } catch (error) {
            const message = getApiErrorMessage(error, 'Failed to update task');
            console.warn('Failed to update task:', message);
        }
    }, [updateTask]);

    const handleFocus = useCallback((taskId: string, taskTitle: string) => {
        router.push(`/focus-session?taskId=${taskId}&task=${encodeURIComponent(taskTitle)}&duration=25`);
    }, [router]);

    // Sort: non-completed first by priority desc, then completed.
    // Wrapped in useMemo so the O(n log n) sort only runs when `tasks`
    // changes (i.e. on a network response), not on every render tick.
    const sortedTasks = useMemo(() => {
        if (!tasks) return [];
        return [...tasks].sort((a, b) => {
            if (a.status === TaskStatus.COMPLETED && b.status !== TaskStatus.COMPLETED) return 1;
            if (a.status !== TaskStatus.COMPLETED && b.status === TaskStatus.COMPLETED) return -1;
            return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0);
        });
    }, [tasks]);

    const incompleteTasks = sortedTasks.filter(t => t.status !== TaskStatus.COMPLETED);
    const top3 = incompleteTasks.slice(0, 3);
    const rest = incompleteTasks.slice(3);
    const completedTasks = sortedTasks.filter(t => t.status === TaskStatus.COMPLETED);
    const sections = [
        {
            key: 'top3',
            title: '🎯 Focus on these first',
            titleClass: 'text-purple-400/80',
            className: 'space-y-3',
            tasks: top3,
            isTop3: true,
        },
        {
            key: 'rest',
            title: 'Other tasks',
            titleClass: 'text-slate-500',
            className: 'space-y-3 mt-4 pt-4 border-t border-white/5',
            tasks: rest,
            isTop3: false,
        },
        {
            key: 'completed',
            title: '✓ Completed',
            titleClass: 'text-green-500/60',
            className: 'space-y-3 mt-4 pt-4 border-t border-white/5',
            tasks: completedTasks,
            isTop3: false,
        },
    ] as const;

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Today&apos;s Tasks</h2>
                    <div className="text-sm text-slate-400 mt-1">
                        {isLoading ? <Skeleton className="h-4 w-32 bg-white/5" /> : (tasks?.length ? `${tasks.filter(t => t.status === TaskStatus.COMPLETED).length}/${tasks.length} completed` : 'Get started with your goals')}
                    </div>
                </div>
                <Link href="/tasks" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-all duration-300 font-semibold group">
                    Tasks
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />
                        ))}
                    </div>
                ) : sortedTasks.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={incompleteTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {sections.map((section) =>
                                section.tasks.length > 0 ? (
                                    <div key={section.key} className={section.className}>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${section.titleClass}`}>{section.title}</p>
                                        <div className="space-y-3 mt-3">
                                            <AnimatePresence mode="popLayout">
                                                {section.tasks.map((task, i) => (
                                                    <TaskItem
                                                        key={task.id}
                                                        task={task}
                                                        isTop3={section.isTop3}
                                                        index={i}
                                                        onToggle={handleToggle}
                                                        onUpdate={handleUpdate}
                                                        onFocus={handleFocus}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : null
                            )}
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                        <EmptyTasksIllustration className="w-32 h-24 mb-3 text-purple-500" />
                        <p className="text-slate-400 text-sm font-medium">No tasks scheduled for today.</p>
                        <Link href="/createtask" className="mt-4 inline-block text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 px-5 py-2.5 rounded-full hover:bg-purple-500/20 transition-all active:scale-95">
                            + Add a task
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
