// components/tasks/KanbanBoard.tsx
import { TaskStatus, Task } from "@repo/store";
import { BoardColumn } from "./BoardColumn";
import { filterTasks } from "@/lib/filterTasks";

interface KanbanBoardProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
    sort: 'default' | 'quickWins';
    tasks: Task[];
}

export function KanbanBoard({ searchQuery, status, priority, category, sort, tasks }: KanbanBoardProps) {
    void status;

    // Filter by status for columns
    // Note: API returns TaskStatus enum (PENDING, IN_PROGRESS, COMPLETED)
    const todoTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

    const filters = { searchQuery, priority, category, status, sort };
    const filteredTodo = filterTasks(todoTasks, filters);
    const filteredInProgress = filterTasks(inProgressTasks, filters);
    const filteredCompleted = filterTasks(completedTasks, filters);



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
