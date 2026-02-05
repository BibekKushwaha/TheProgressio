"use client";

import React from "react";
import { ArrowUp, Clock, ListTodo, Trophy, Plus, Flame, CheckSquare } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import GlassCard from "../../components/ui/glass-card";
import GradientButton from "../../components/ui/gradient-button";
import PageHeader from "../../components/ui/page-header";

const DashboardPage = () => {
    // Mock Data
    const activityData = [
        { name: "Mon", hours: 2.5 },
        { name: "Tue", hours: 4.2 },
        { name: "Wed", hours: 3.8 },
        { name: "Thu", hours: 5.5 },
        { name: "Fri", hours: 3.0 },
        { name: "Sat", hours: 6.0 },
        { name: "Sun", hours: 4.5 },
    ];

    const tasks = [
        { id: 1, title: "Finish Math Assignment", priority: "High", category: "Studies", completed: false },
        { id: 2, title: "Read Chapter 4", priority: "Medium", category: "Studies", completed: true },
        { id: 3, title: "Workout", priority: "Medium", category: "Health", completed: false },
    ];

    const habits = [
        { id: 1, name: "Morning Reading", streak: 12, active: true },
        { id: 2, name: "Coding Practice", streak: 5, active: true },
        { id: 3, name: "Meditation", streak: 0, active: false },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Welcome back, Alex!"
                description="Thursday, February 6th, 2026"
            >
                <GradientButton className="shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4 mr-2" />
                    Quick Actions
                </GradientButton>
            </PageHeader>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily Progress */}
                <GlassCard className="p-6 flex items-center justify-between" gradient>
                    <div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Daily Goal</p>
                        <h3 className="text-3xl font-bold text-white">2.5<span className="text-xl text-gray-500">/4h</span></h3>
                        <p className="text-xs text-indigo-300 mt-2">1.5 hours remaining</p>
                    </div>
                    <div className="w-20 h-20 relative flex items-center justify-center">
                        {/* Simple SVG Ring Placeholder */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                            <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="200" strokeDashoffset="80" className="text-indigo-500" strokeLinecap="round" />
                        </svg>
                        <Clock className="w-6 h-6 absolute text-white" />
                    </div>
                </GlassCard>

                {/* Focus Score */}
                <GlassCard className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Focus Score</p>
                        <h3 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">85</h3>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center text-emerald-400 text-sm font-bold bg-emerald-500/10 px-2 py-1 rounded-full mb-1">
                            <ArrowUp className="w-3 h-3 mr-1" />
                            5%
                        </div>
                        <span className="text-xs text-gray-500">vs last week</span>
                    </div>
                </GlassCard>

                {/* Active Streak */}
                <GlassCard className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Top Streak</p>
                        <h3 className="text-3xl font-bold text-white">12 Days</h3>
                        <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-orange-400" />
                            Keep it burning!
                        </p>
                    </div>
                    <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                        <Flame className="w-8 h-8 text-orange-500 fill-orange-500/50 animate-pulse" />
                    </div>
                </GlassCard>
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (ACTIVITY & TASKS) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Chart */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">Weekly Activity</h3>
                            <select className="bg-white/5 border border-white/10 rounded-lg text-sm px-3 py-1 text-gray-400 focus:outline-none">
                                <option>Last 7 Days</option>
                            </select>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activityData}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="hours" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* Today's Tasks */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <ListTodo className="w-5 h-5 text-indigo-400" />
                                Today's Tasks
                            </h3>
                            <button className="text-sm text-indigo-400 hover:text-indigo-300">View All</button>
                        </div>
                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div key={task.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-indigo-500'}`}>
                                        {task.completed && <CheckSquare className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${task.priority === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {task.priority}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                                            <span className="text-[10px] text-gray-400">{task.category}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column (HABITS & WIDGETS) */}
                <div className="space-y-6">
                    <GlassCard className="p-6 relative overflow-hidden" gradient>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                Habit Streaks
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {habits.map(habit => (
                                <div key={habit.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                            <Flame className={`w-5 h-5 ${habit.active ? 'text-orange-400 fill-orange-400/20' : 'text-gray-500'}`} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-white">{habit.name}</h4>
                                            <p className="text-xs text-gray-400">{habit.streak} Day Streak</p>
                                        </div>
                                    </div>
                                    <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${habit.active ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                                        <CheckSquare className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white border border-dashed border-white/20 rounded-lg hover:bg-white/5 transition-all">
                            + Add New Habit
                        </button>
                    </GlassCard>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">Focus Mode</h3>
                            <p className="text-white/80 text-sm mb-4">Ready to get in the zone? Start a focused work session now.</p>
                            <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:shadow-lg transition-all active:scale-95">
                                Start Session
                            </button>
                        </div>
                        <Clock className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
