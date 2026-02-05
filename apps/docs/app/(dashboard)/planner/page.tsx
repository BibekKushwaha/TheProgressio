"use client";

import React, { useState } from "react";
import { Plus, Search, Filter, LayoutGrid, List as ListIcon, Calendar, MoreVertical } from "lucide-react";
import GlassCard from "../../components/ui/glass-card";
import GradientButton from "../../components/ui/gradient-button";
import PageHeader from "../../components/ui/page-header";
import { cn } from "../../../lib/utils";
import { useAppDispatch, useCreateTaskMutation, Priority, Status, addTask, useCreateCategoryMutation, addCategory, useGetCategoriesQuery, useGetTasksQuery } from "@repo/store";
import InputTextbox from "@repo/ui/inputtextbox";
import { categorySchema, taskSchema } from "@repo/schemas";


const PRIORITY_COLOR = {
  HIGH: "text-red-400",
  MEDIUM: "text-blue-400",
  LOW: "text-gray-400",
};

const STATUS_COLOR = {
  PENDING: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
};
// Mock Data
const INITIAL_TASKS = [
    { id: '1', title: 'Complete Math Assignment', category: 'Studies', priority: 'High', status: 'TODO', date: 'Today' },
    { id: '2', title: 'Review Physics Notes', category: 'Studies', priority: 'Medium', status: 'TODO', date: 'Tomorrow' },
    { id: '3', title: 'Gym Workout', category: 'Health', priority: 'Medium', status: 'IN_PROGRESS', date: 'Today' },
    { id: '4', title: 'Buy Groceries', category: 'Personal', priority: 'Low', status: 'COMPLETED', date: 'Yesterday' },
    { id: '5', title: 'React Project', category: 'Coding', priority: 'High', status: 'IN_PROGRESS', date: 'Next Week' },
];

function formatDueDate(dueDate?: string | null) {
  if (!dueDate) return "No due date";

  const date = new Date(dueDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays =
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return "Next week";

  // fallback
  return target.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PlannerPage = () => {
    const [creatTaskApi] = useCreateTaskMutation();
    const [createCategoryApi] = useCreateCategoryMutation();
    const dispatch = useAppDispatch();
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskName, setTaskName] = useState('');
    const [dueDate, setDueDate] = useState<Date>(new Date());
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [priority, setPriority] = useState<Priority | "">("");
    const [categoryName, setCategoryName] = useState('');
    
    const { data: categories } = useGetCategoriesQuery();
    const { data: allTasks } = useGetTasksQuery();

    const categoryOptions = [
        {name: 'All', color: '#6B7280'},
        {name: 'Studies', color: '#3B82F6' },
        {name: 'Health', color: '#22C55E' },
        {name: 'Personal', color: '#F97316' },
        {name: 'Coding', color: '#A855F7' },
    ];

    const normalizedTasks = (allTasks && allTasks.length > 0)
        ? allTasks.map((task) => {
            const categoryName = task.category?.name
                || categories?.find(c => c.id === task.categoryId)?.name
                || 'No category';
            const categoryColor = categories?.find(c => c.id === task.categoryId)?.colorCode || '#6B7280';
            const normalizedStatus = task.status === 'TODO' ? 'PENDING' : task.status;
            return { ...task, categoryName, categoryColor, normalizedStatus };
        })
        : INITIAL_TASKS.map((task) => ({
            ...task,
            categoryName: task.category,
            categoryColor: categoryOptions.find(c => c.name === task.category)?.color || '#6B7280',
            normalizedStatus: task.status === 'TODO' ? 'PENDING' : task.status,
        }));

    const filteredTasks = normalizedTasks.filter((task) => {
        const matchesCategory =
            selectedCategory === "All" ||
            task.categoryName === selectedCategory;

        const matchesSearch = task.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    const handleCreateTask = async () => {
        // If user provided a category name but not selected an id, create the category first
         
        const catColor = categoryOptions.find(c => c.name === categoryName)?.color || '#6B7280';
        
        const validatedCategory = categorySchema.safeParse({ name: categoryName.trim(),colorCode: catColor });
        
        let categoryId ;
        if (validatedCategory.success){
            setIsLoading(true);
            try {
                const catResp = await createCategoryApi({ name: validatedCategory.data.name, colorCode: validatedCategory.data.colorCode }).unwrap();
                if (catResp.id) {
                   dispatch(addCategory(catResp));
                }
                categoryId = catResp.id;
            } catch (err) {
                setIsLoading(false);
                setErrors({ category: 'Failed to create category' });
                return;
            } 
        }

        const validationResult = taskSchema.safeParse({
            title: taskName.trim(),
            dueDate,
            categoryId: categoryId || undefined,
            priority: priority || undefined,
        });

        if (!validationResult.success) {
            const fieldErrors: Record<string, string | undefined> = {};
            validationResult.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0].toString()] = err.message;
                }
            });
            setErrors(fieldErrors);
            setIsLoading(false);
            return;
        }
        try {
            const response = await creatTaskApi({
                ...validationResult.data,
                priority: validationResult.data.priority as Priority,
                status: validationResult.data.status as Status,
                dueDate: validationResult.data.dueDate?.toISOString(),
            }).unwrap();
            dispatch(addTask(response));
            setTaskName('');
            setDueDate(new Date());
            setErrors({});
        } catch (error) {
            setErrors(error as Record<string, string | undefined>);
        } finally {
            setIsLoading(false);
        }
    };

    

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader title="Planner" description="Manage your tasks and projects">
                <div className="flex gap-2">
                    <div className="relative hidden md:block w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <GradientButton onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                    </GradientButton>
                    
                </div>
            </PageHeader>
            {isModalOpen && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:w-96 w-full h-120 rounded-xl bg-white shadow-2xl border border-gray-100 z-[60] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-violet-400/20 to-blue-400/20 animate-gradient-shift pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/10 via-violet-400/10 to-indigo-400/10 animate-gradient-shift-reverse pointer-events-none" />
                    <div className="relative z-10 h-full flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Create New Task</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <InputTextbox
                                label="taskName"
                                labelText="Task Name"
                                placeholder="Enter task name"
                                type="text"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                errors={errors}
                                isLoading={isLoading}
                            />
                            <div className="space-y-2">
                                <label htmlFor="priority" className="block text-gray-700 mb-1 font-medium">Priority</label>
                                <select
                                    id="priority"
                                    name="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                    className="border rounded-lg border-gray-700 px-3 py-2 w-full text-gray-700">
                                    <option value="">Select</option>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="category" className="block text-gray-700 mb-1 font-medium">Category</label>
                                <select
                                    id="category"
                                    name="category"
                                    value={categoryName}
                                    onChange={(e) => {setCategoryName(e.target.value); console.log(e.target.value);}}
                                    className="border rounded-lg border-gray-700 px-3 py-2 w-full text-gray-700">
                                    <option value="">Select</option>
                                    {categoryOptions.filter(c => c.name !== 'All').map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <InputTextbox
                                label="dueDate"
                                labelText="Due Date"
                                placeholder="Enter due date"
                                type="date"
                                value={dueDate.toISOString().split('T')[0] || ''}
                                onChange={(e) => setDueDate(new Date(e.target.value))}
                                errors={errors}
                                isLoading={isLoading}
                            />

                            <GradientButton
                                className="w-full mt-4"
                                onClick={handleCreateTask}
                                isLoading={isLoading}
                            >
                                Create
                            </GradientButton>
                        </div>
                    </div>
                </div>
            )}
            {/* Controls Row */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Categories */}
                <div className="flex flex-wrap gap-2">
                    {categoryOptions.map(cat => (
                        <button
                            key={cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border border-transparent",
                                selectedCategory === cat.name
                                    ? "bg-white/10 text-white border-white/10"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <span className={cn("w-2 h-2 rounded-full inline-block mr-2")} style={{ backgroundColor: cat.color }} />
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setView('kanban')}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            view === 'kanban' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            view === 'list' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <ListIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {view === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
                    {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                        <div key={status} className="min-w-[300px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        status === 'TODO' ? "bg-gray-400" :
                                            status === 'IN_PROGRESS' ? "bg-blue-500" : "bg-green-500"
                                    )} />
                                    {status.replace('_', ' ')}
                                    <span className="text-xs text-gray-500 ml-2 bg-white/5 px-2 py-0.5 rounded-full">
                                        {filteredTasks.filter(t => t.normalizedStatus === status).length}
                                    </span>
                                </h3>
                                <button className="text-gray-400 hover:text-white">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {filteredTasks.filter(t => t.normalizedStatus === status).map(task => (
                                    <GlassCard key={task.id} className="p-4 cursor-grab active:cursor-grabbing hover:border-indigo-500/30 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={cn(PRIORITY_COLOR[task.priority as keyof typeof PRIORITY_COLOR])}>
                                                {task.priority}
                                            </span>
                                            <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <h4 className="text-sm font-medium text-white mb-3">{task.title}</h4>
                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <span
                                                    className={cn("w-1.5 h-1.5 rounded-full")}
                                                    style={{ backgroundColor: task.categoryColor }}
                                                />
                                                {task.categoryName}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDueDate(task.dueDate)}
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredTasks.map((task) => (
                    <GlassCard
                        key={task.id}
                        className="p-4 flex items-center justify-between group hover:border-indigo-500/30"
                    >
                        <div className="flex items-center gap-4">
                        <div className={cn("w-2 h-2 rounded-full", STATUS_COLOR[task.normalizedStatus as keyof typeof STATUS_COLOR])} />

                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-white">
                            {task.title}
                            </h4>

                            <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{task.categoryName}</span>
                            <span>•</span>
                            <span
                                className={cn(PRIORITY_COLOR[task.priority as keyof typeof PRIORITY_COLOR])}
                            >
                                {task.priority}
                            </span>
                            </div>
                        </div>
                        </div>

                        <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            {formatDueDate(task.dueDate)}
                        </div>

                        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        </div>
                    </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlannerPage;
