
'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { SubTask, useCreateSubTaskMutation, useUpdateSubTaskMutation, useDeleteSubTaskMutation } from '@repo/store';

interface SubTaskListProps {
    taskId: string;
    subtasks: SubTask[];
}

export function SubTaskList({ taskId, subtasks }: SubTaskListProps) {
    const [createSubTask] = useCreateSubTaskMutation();
    const [updateSubTask] = useUpdateSubTaskMutation();
    const [deleteSubTask] = useDeleteSubTaskMutation();

    const [isAdding, setIsAdding] = useState(false);
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

    const handleToggle = (subtask: SubTask) => {
        updateSubTask({
            id: subtask.id,
            taskId: subtask.taskId,
            completed: !subtask.completed
        });
    };

    const handleDelete = (subtask: SubTask) => {
        if (confirm('Delete subtask?')) {
            deleteSubTask({ id: subtask.id, taskId: subtask.taskId });
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubTaskTitle.trim()) return;

        try {
            await createSubTask({ taskId, title: newSubTaskTitle }).unwrap();
            setNewSubTaskTitle('');
            setIsAdding(false);
        } catch (error) {
            console.error('Failed to create subtask', error);
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Sub-Tasks</h3>

            <div className="space-y-3 mb-4">
                {subtasks.map((task) => (
                    <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group"
                    >
                        <div onClick={() => handleToggle(task)} className="flex items-center gap-3 flex-1 cursor-pointer">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-indigo-500 bg-transparent'}`}>
                                {task.completed && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={`flex-1 ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {task.title}
                            </span>
                        </div>
                        <button
                            onClick={() => handleDelete(task)}
                            className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {isAdding ? (
                <form onSubmit={handleAdd} className="flex items-center gap-2">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Enter subtask title..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newSubTaskTitle}
                        onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    />
                    <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold transition-colors">Add</button>
                    <button type="button" onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </form>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-all duration-300"
                >
                    <Plus className="w-4 h-4" />
                    Add sub-task
                </button>
            )}
        </div>
    );
}