"use client";

import React, { useState } from "react";
import { User, Bell, Moon, Sun, Trash2, Shield, Camera } from "lucide-react";
import GlassCard from "../../components/ui/glass-card";
import GradientButton from "../../components/ui/gradient-button";
import Input from "../../components/ui/input";
import PageHeader from "../../components/ui/page-header";

const SettingsPage = () => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [goalHours, setGoalHours] = useState(4);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <PageHeader title="Settings" description="Manage your preferences and account" />

            {/* Profile Section */}
            <GlassCard className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 p-1">
                            <div className="w-full h-full rounded-full bg-slate-900 border-4 border-slate-900 flex items-center justify-center overflow-hidden relative group">
                                <User className="w-16 h-16 text-gray-500" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>
                        <button className="text-sm text-indigo-400 hover:text-white font-medium">Change Photo</button>
                    </div>

                    {/* Info Form */}
                    <div className="flex-1 space-y-4 w-full">
                        <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Username" defaultValue="alex_dev" />
                            <Input label="Email" defaultValue="alex@example.com" type="email" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Bio</label>
                            <textarea className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24" placeholder="Tell us about yourself..." defaultValue="Student developer building cool things." />
                        </div>
                        <div className="flex justify-end pt-2">
                            <GradientButton>Save Changes</GradientButton>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Preferences */}
            <GlassCard className="p-8">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-4 mb-6">Preferences</h3>

                <div className="space-y-8">
                    {/* Goal Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <label className="font-medium text-gray-300">Daily Goal</label>
                            <span className="text-indigo-400 font-bold">{goalHours} Hours</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="12"
                            step="0.5"
                            value={goalHours}
                            onChange={(e) => setGoalHours(parseFloat(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-gray-500">Set your daily target for Deep Work sessions.</p>
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="font-medium text-white">Appearance</h4>
                                <p className="text-sm text-gray-500">Customize interface theme</p>
                            </div>
                        </div>
                        <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
                            <button
                                onClick={() => setTheme('light')}
                                className={`px-4 py-1.5 rounded-md text-sm transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`px-4 py-1.5 rounded-md text-sm transition-all ${theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Dark
                            </button>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-white">Notifications</h4>
                                <p className="text-sm text-gray-500">Manage email alerts</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="mr-2 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500" />
                                <span className="text-sm text-gray-300">Daily Digest</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" className="mr-2 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500" />
                                <span className="text-sm text-gray-300">Weekly Report</span>
                            </label>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Danger Zone */}
            <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-red-400">Delete Account</h3>
                        <p className="text-sm text-red-300/70">Permanently remove your account and all data. This action cannot be undone.</p>
                    </div>
                </div>
                <button className="px-6 py-2 border border-red-500/50 text-red-400 font-medium rounded-lg hover:bg-red-500/10 transition-colors whitespace-nowrap flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
