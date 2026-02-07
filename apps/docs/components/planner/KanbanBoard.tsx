// components/tasks/KanbanBoard.tsx
import { useGetTasksQuery, TaskStatus, Task } from "@repo/store";
import { BoardColumn } from "./BoardColumn";

interface KanbanBoardProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
    tasks: Task[];
}

export function KanbanBoard({ searchQuery, status, priority, category, tasks }: KanbanBoardProps) {
    // const { data: allTasks, isLoading } = useGetTasksQuery(); // Removed
    // const tasks = allTasks || []; // Removed

    const filterTasks = (taskList: Task[]) => {
        return taskList.filter(task => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                task.title.toLowerCase().includes(searchLower);

            const matchesPriority = priority === 'all' || task.priority.toLowerCase() === priority.toLowerCase();

            // Assuming category filter is by name for now, or ID if passed. The props say 'category' (string).
            // The TaskHeader passes 'selectedCategory' which is a name (e.g. "Personal") or "all".
            const taskCategoryName = task.category?.name || 'No Category';
            const matchesCategory = category === 'all' || taskCategoryName.toLowerCase() === category.toLowerCase();

            return matchesSearch && matchesPriority && matchesCategory;
        });
    };

    // Filter by status for columns
    // Note: API returns TaskStatus enum (PENDING, IN_PROGRESS, COMPLETED)
    const todoTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

    const filteredTodo = filterTasks(todoTasks);
    const filteredInProgress = filterTasks(inProgressTasks);
    const filteredCompleted = filterTasks(completedTasks);



    return (
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BoardColumn title="To Do" color="bg-slate-500" tasks={filteredTodo} />
                <BoardColumn title="In Progress" color="bg-blue-500" tasks={filteredInProgress} />
                <BoardColumn title="Completed" color="bg-green-500" tasks={filteredCompleted} />
            </div>
        </div>
    );
}