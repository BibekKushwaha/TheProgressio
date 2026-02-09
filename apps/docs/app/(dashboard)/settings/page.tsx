"use client";

import React from "react";
import { User, Bell, Lock, Palette, Globe, Loader2 } from "lucide-react";
import { useGetProfileQuery, useUpdateProfileMutation } from "@repo/store";

import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
    const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

    const user = profileData?.user;

    const handleDailyGoalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = parseFloat(e.target.value.split(" ")[0] || "0");
        try {
            await updateProfile({ dailyGoalHours: value }).unwrap();
        } catch (error) {
            console.error("Failed to update daily goal:", error);
        }
    };

    const [profileFields, setProfileFields] = React.useState({
        username: "",
        email: ""
    });

    React.useEffect(() => {
        if (user) {
            setProfileFields({
                username: user.username,
                email: user.email
            });
        }
    }, [user]);

    const handleProfileUpdate = async () => {
        try {
            await updateProfile(profileFields).unwrap();
        } catch (error) {
            console.error("Failed to update profile:", error);
        }
    };

    if (isProfileLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3 bg-white/5" />
                <Skeleton className="h-6 w-1/2 bg-white/5" />
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-6">
                        <Skeleton className="w-20 h-20 rounded-full bg-white/5" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-32 bg-white/5" />
                            <Skeleton className="h-4 w-48 bg-white/5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-12 w-full bg-white/5" />
                        <Skeleton className="h-12 w-full bg-white/5" />
                    </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
                    <Skeleton className="h-16 w-full bg-white/5" />
                    <Skeleton className="h-16 w-full bg-white/5" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Settings & Profile Management</h1>
                <p className="text-slate-400">Customize your experience and manage your account.</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <User className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Profile Information</h2>
                </div>
                <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-3xl font-bold uppercase">
                        {user?.username?.[0] || "U"}
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-bold text-xl">{user?.username}</div>
                        <div className="text-slate-400">{user?.email}</div>
                    </div>
                    <button
                        onClick={handleProfileUpdate}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg border border-indigo-400/20 transition-colors disabled:opacity-50"
                    >
                        {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Username</label>
                        <input
                            type="text"
                            value={profileFields.username}
                            onChange={(e) => setProfileFields(prev => ({ ...prev, username: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Email</label>
                        <input
                            type="email"
                            value={profileFields.email}
                            onChange={(e) => setProfileFields(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <Palette className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Preferences</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <div className="text-white font-medium">Dark Mode</div>
                            <div className="text-sm text-slate-400">Use dark theme across the app</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <div className="text-white font-medium">Daily Goal</div>
                            <div className="text-sm text-slate-400">Set your daily focus time goal</div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isUpdating && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                            <select
                                value={`${user?.dailyGoalHours || 4} hours`}
                                onChange={handleDailyGoalChange}
                                disabled={isUpdating}
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                            >
                                <option className="bg-slate-900">1 hours</option>
                                <option className="bg-slate-900">2 hours</option>
                                <option className="bg-slate-900">3 hours</option>
                                <option className="bg-slate-900">4 hours</option>
                                <option className="bg-slate-900">5 hours</option>
                                <option className="bg-slate-900">6 hours</option>
                                <option className="bg-slate-900">7 hours</option>
                                <option className="bg-slate-900">8 hours</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Notifications</h2>
                </div>
                <div className="space-y-4">
                    {[
                        { title: "Task Reminders", description: "Get notified about upcoming tasks" },
                        { title: "Streak Alerts", description: "Reminders to maintain your streak" },
                        { title: "Achievement Unlocks", description: "Celebrate when you unlock new badges" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                            <div>
                                <div className="text-white font-medium">{item.title}</div>
                                <div className="text-sm text-slate-400">{item.description}</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Security */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Security</h2>
                </div>
                <button className="w-full md:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors">
                    Change Password
                </button>
            </div>
        </div>
    );
}

