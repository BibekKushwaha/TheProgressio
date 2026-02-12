
import { Clock, MoreVertical, Trash2, CheckCircle, XCircle, Calendar, Edit } from 'lucide-react';
import { Task, PriorityEnum, TaskStatus, useDeleteTaskMutation, useToggleTaskMutation } from '@repo/store';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';

interface TaskListCardProps {
    task: Task;
    completed: boolean;
}

const PRIORITY_COLORS = {
    [PriorityEnum.HIGH]: 'text-red-400',
    [PriorityEnum.MEDIUM]: 'text-yellow-400',
    [PriorityEnum.LOW]: 'text-green-400',
};

const STATUS_COLOR = {
    [TaskStatus.PENDING]: "bg-slate-400",
    [TaskStatus.IN_PROGRESS]: "bg-blue-500",
    [TaskStatus.COMPLETED]: "bg-green-500",
};

export function TaskListCard({ task, completed }: TaskListCardProps) {
    const router = useRouter();
    const [deleteTask] = useDeleteTaskMutation();
    const [toggleTask] = useToggleTaskMutation();

    const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[PriorityEnum.LOW];
    const categoryName = task.category?.name || 'No Category';

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'No Date';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(task.id);
        }
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleTask(task.id);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/createtask?id=${task.id}`);
    };

    const handleCardClick = () => {
        router.push(`/planner/${task.id}`);
    };

    return (
        <div
            className={`group flex items-center justify-between bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${completed ? 'opacity-60' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${STATUS_COLOR[task.status] || 'bg-slate-400'}`} />

                <div className="space-y-1">
                    <h4 className={`text-sm font-medium text-white ${completed ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{categoryName}</span>
                        <span>•</span>
                        <span className={priorityColor}>
                            {task.priority}
                        </span>
                    </div>

                    {task.subtasks && task.subtasks.length > 0 && (() => {
                        const total = task.subtasks.length;
                        const done = task.subtasks.filter(s => s.completed).length;
                        const pct = Math.round((done / total) * 100);
                        return (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${pct === 100
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                            }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-semibold ${pct === 100 ? 'text-green-400' : 'text-slate-500'}`}>
                                    {done}/{total}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(task.dueDate)}</span>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={handleEdit} className="focus:bg-white/10 focus:text-white cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCardClick} className="focus:bg-white/10 focus:text-white cursor-pointer">
                            <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                            Focus
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleToggle} className="focus:bg-white/10 focus:text-white cursor-pointer">
                            {task.status === TaskStatus.PENDING && (
                                <>
                                    <Clock className="w-4 h-4 mr-2 text-blue-400" />
                                    <span>Start Task</span>
                                </>
                            )}
                            {task.status === TaskStatus.IN_PROGRESS && (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                                    <span>Complete Task</span>
                                </>
                            )}
                            {task.status === TaskStatus.COMPLETED && (
                                <>
                                    <XCircle className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>Reset Task</span>
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>

            <div
                className="absolute inset-0 z-0"
                onClick={handleCardClick}
            />
        </div>
    );
}
