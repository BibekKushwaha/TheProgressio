// components/tasks/BoardColumn.tsx

import { Task } from "@repo/store";
import { TaskCard } from "./TaskCard";

interface BoardColumnProps {
    title: string;
    color: string;
    tasks: Task[];
}

export function BoardColumn({ title, color, tasks }: BoardColumnProps) {
    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                </div>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-semibold text-slate-300">
                    {tasks.length}
                </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-h-[600px]">
                <div className="space-y-4">
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} completed={title === 'Completed'} />
                    ))}
                </div>
            </div>
        </div>
    );
}