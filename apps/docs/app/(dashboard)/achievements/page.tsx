"use client";

import React from "react";
import { Trophy, Lock, Star, Award, Target, Zap } from "lucide-react";

export default function AchievementsPage() {
    const achievements = [
        { id: 1, name: "First Steps", description: "Complete your first task", icon: Target, unlocked: true, date: "Jan 15, 2026" },
        { id: 2, name: "Week Warrior", description: "Maintain a 7-day streak", icon: Zap, unlocked: true, date: "Jan 22, 2026" },
        { id: 3, name: "Focus Master", description: "Complete 10 focus sessions", icon: Star, unlocked: true, date: "Feb 1, 2026" },
        { id: 4, name: "Early Bird", description: "Start 5 sessions before 8 AM", icon: Award, unlocked: false, progress: 60 },
        { id: 5, name: "Night Owl", description: "Complete 5 sessions after 10 PM", icon: Trophy, unlocked: false, progress: 20 },
        { id: 6, name: "Consistency King", description: "Maintain a 30-day streak", icon: Zap, unlocked: false, progress: 40 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Achievements & Badges</h1>
                <p className="text-slate-400">Track your milestones and unlock new badges.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="text-sm text-slate-400 mb-2">Total Achievements</div>
                    <div className="text-3xl font-bold text-white">{achievements.length}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="text-sm text-slate-400 mb-2">Unlocked</div>
                    <div className="text-3xl font-bold text-white">{achievements.filter(a => a.unlocked).length}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="text-sm text-slate-400 mb-2">Completion Rate</div>
                    <div className="text-3xl font-bold text-white">{Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%</div>
                </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                        <div
                            key={achievement.id}
                            className={`bg-white/5 backdrop-blur-xl border rounded-xl p-6 shadow-xl transition-all hover:scale-105 ${achievement.unlocked ? 'border-indigo-500/50' : 'border-white/10'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${achievement.unlocked ? 'bg-gradient-to-br from-indigo-500 to-violet-500' : 'bg-white/10'
                                    }`}>
                                    {achievement.unlocked ? (
                                        <Icon className="w-7 h-7 text-white" />
                                    ) : (
                                        <Lock className="w-7 h-7 text-slate-500" />
                                    )}
                                </div>
                                {achievement.unlocked && (
                                    <div className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                                        UNLOCKED
                                    </div>
                                )}
                            </div>
                            <h3 className={`text-lg font-bold mb-2 ${achievement.unlocked ? 'text-white' : 'text-slate-500'}`}>
                                {achievement.name}
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">{achievement.description}</p>
                            {achievement.unlocked ? (
                                <div className="text-xs text-indigo-400 font-medium">Unlocked on {achievement.date}</div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Progress</span>
                                        <span>{achievement.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-brand to-violet-brand"
                                            style={{ width: `${achievement.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
