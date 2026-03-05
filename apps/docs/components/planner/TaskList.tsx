
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Task } from "@repo/store";
import { TaskListCard } from "./TaskListCard";
import { filterTasks } from "@/lib/filterTasks";

interface TaskListProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
    effort: string;
    sort: 'default' | 'quickWins';
    tasks: Task[];
    highlightedTaskId?: string;
}

export function TaskList({ searchQuery, status, priority, category, effort, sort, tasks, highlightedTaskId }: TaskListProps) {
    const filteredTasks = filterTasks(tasks, { searchQuery, priority, category, status, effort, sort });

    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: filteredTasks.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 104, // ~96px card + 8px gap
        overscan: 5,
    });

    if (filteredTasks.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <h3 className="text-xl font-bold text-slate-300 mb-2">No tasks found</h3>
                <p className="text-slate-500 mb-6">Try adjusting your filters or search query.</p>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="max-w-7xl mx-auto overflow-y-auto"
            style={{ height: 'calc(100vh - 17rem)' }}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const task = filteredTasks[virtualItem.index]!;
                    return (
                        <div
                            key={task.id}
                            id={`task-card-${task.id}`}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                                paddingBottom: '8px',
                            }}
                            className={
                                task.id === highlightedTaskId
                                    ? 'rounded-2xl ring-2 ring-purple-400/70 shadow-[0_0_0_1px_rgba(168,85,247,0.45)] pulse-once'
                                    : ''
                            }
                        >
                            <TaskListCard task={task} completed={task.status === 'COMPLETED'} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
