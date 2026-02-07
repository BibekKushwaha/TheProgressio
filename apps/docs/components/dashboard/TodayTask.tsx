// components/dashboard/TodaysTasks.tsx
import { ChevronRight } from 'lucide-react';

const tasks = [
    { id: 1, title: 'Complete Math Assignment', time: '10:00 AM', priority: 'HIGH', completed: false },
    { id: 2, title: 'Study Chapter 5', time: '2:00 PM', priority: 'MED', completed: false },
    { id: 3, title: 'Team Meeting', time: '4:30 PM', priority: 'LOW', completed: false },
    { id: 4, title: 'Review Notes', time: '9:00 AM', priority: 'DONE', completed: true },
];

export function TodaysTasks() {
    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'MED':
                return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case 'LOW':
                return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            case 'DONE':
                return 'text-green-400 bg-green-500/20 border-green-500/30';
            default:
                return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
        }
    };

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Today's Tasks</h2>
                <button className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-all duration-300">
                    See All
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={`flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 ${task.completed ? 'opacity-50' : ''
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={task.completed}
                            readOnly
                            className="w-5 h-5 rounded border-2 border-purple-500 bg-transparent checked:bg-purple-500 cursor-pointer"
                        />

                        <div className="flex-1">
                            <div className={`font-semibold mb-1 ${task.completed ? 'line-through' : ''}`}>
                                {task.title}
                            </div>
                            <div className="text-sm text-slate-400">{task.time}</div>
                        </div>

                        <span
                            className={`px-3 py-1 border rounded-lg text-xs font-semibold ${getPriorityStyle(task.priority)}`}
                        >
                            {task.priority}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}