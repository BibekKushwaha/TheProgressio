
import { Task } from "@repo/store";
import { TaskListCard } from "./TaskListCard";

interface TaskListProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
    tasks: Task[];
}

export function TaskList({ searchQuery, status, priority, category, tasks }: TaskListProps) {

    // Filter logic duplicated from KanbanBoard - should ideally be lifted to page or a hook
    // usage: filterTasks(tasks)
    const filterTasks = (taskList: Task[]) => {
        return taskList.filter(task => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                task.title.toLowerCase().includes(searchLower);

            const matchesPriority = priority === 'all' || task.priority.toLowerCase() === priority.toLowerCase();

            const taskCategoryName = task.category?.name || 'No Category';
            const matchesCategory = category === 'all' || taskCategoryName.toLowerCase() === category.toLowerCase();

            // Status filter logic for list view? 
            // If "all", show everything. If specific status, show that.
            // But usually list view shows all and sorts/groups. 
            // For now, let's respect the status filter if set (e.g. from header controls if any).
            // The TaskHeader currently has a status filter.
            const matchesStatus = status === 'all' || task.status === status;

            return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
        });
    };

    const filteredTasks = filterTasks(tasks);

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
