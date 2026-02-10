
import { Task } from "@repo/store";
import { TaskListCard } from "./TaskListCard";
import { filterTasks } from "@/lib/filterTasks";

interface TaskListProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
    tasks: Task[];
}

export function TaskList({ searchQuery, status, priority, category, tasks }: TaskListProps) {

    const filteredTasks = filterTasks(tasks, { searchQuery, priority, category, status });

    if (filteredTasks.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <h3 className="text-xl font-bold text-slate-300 mb-2">No tasks found</h3>
                <p className="text-slate-500 mb-6">Try adjusting your filters or search query.</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            {filteredTasks.map((task) => (
                <TaskListCard key={task.id} task={task} completed={task.status === 'COMPLETED'} />
            ))}
        </div>
    );
}
