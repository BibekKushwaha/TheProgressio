interface Task {
    id: string;
    title: string;
    dueDate?: string | null;
    priority?: string | null;
    category?: { name: string } | null;
}

export const TaskListItem = ({ task, now }: { task: Task, now: Date }) => {
    const daysLeft = task.dueDate ? Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 99;
    return (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${task.priority === 'HIGH' ? 'bg-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <span className="text-sm text-white font-medium">{task.title}</span>
            </div>
            <div className="flex items-center gap-3">
                {task.category && (
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {task.category.name}
                    </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${daysLeft <= 1 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                </span>
            </div>
        </div>
    );
};
