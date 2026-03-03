'use client';

import { TaskStatus, type Task } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import Link from 'next/link';

export type SubjectTaskStatusFilter =
  | 'all'
  | TaskStatus.PENDING
  | TaskStatus.IN_PROGRESS
  | TaskStatus.COMPLETED;

const STATUS_FILTERS: SubjectTaskStatusFilter[] = [
  'all',
  TaskStatus.PENDING,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
];

interface SubjectTaskPanelProps {
  tasks: Task[];
  isLoading: boolean;
  taskSearch: string;
  onTaskSearchChange: (value: string) => void;
  taskStatus: SubjectTaskStatusFilter;
  onTaskStatusChange: (value: SubjectTaskStatusFilter) => void;
}

export function SubjectTaskPanel({
  tasks,
  isLoading,
  taskSearch,
  onTaskSearchChange,
  taskStatus,
  onTaskStatusChange,
}: SubjectTaskPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks in this subject..."
            value={taskSearch}
            onChange={(e) => onTaskSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => onTaskStatusChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                taskStatus === status
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          {taskSearch || taskStatus !== 'all'
            ? 'No tasks match the current filters.'
            : 'No tasks in this subject yet.'}
        </p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    task.status === 'COMPLETED'
                      ? 'bg-green-400'
                      : task.status === 'IN_PROGRESS'
                        ? 'bg-yellow-400'
                        : 'bg-slate-400'
                  }`}
                />
                <div>
                  <span className="text-sm text-white font-medium group-hover:text-cyan-300 transition-colors">
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                  task.priority === 'HIGH'
                    ? 'bg-red-500/20 text-red-400'
                    : task.priority === 'MEDIUM'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                }`}
              >
                {task.priority}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
