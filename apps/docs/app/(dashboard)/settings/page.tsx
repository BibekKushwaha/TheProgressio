"use client";

import React from "react";
import Link from "next/link";
import {
    Bell,
    Clock,
    Copy,
    CreditCard,
    Languages,
    Loader2,
    Lock,
    MessageSquare,
    Moon,
    Palette,
    QrCode,
    ShieldCheck,
    Smartphone,
    Sparkles,
    User,
    Wifi,
} from "lucide-react";
import { useGetProfileQuery, useUpdateProfileMutation } from "@repo/store";
import { QuietHoursPanel } from "@/components/settings/QuietHoursPanel";
import { PricingSection } from "@/components/settings/PricingSection";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { QRAttendance } from "@/components/settings/QRAttendance";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-provider";

type NotificationSettings = {
    taskReminders: boolean;
    streakAlerts: boolean;
    achievementUnlocks: boolean;
};

type PreferenceSettings = {
    darkMode: boolean;
    syncOnMobileData: boolean;
    notifications: NotificationSettings;
    whatsappPaired: boolean;
    preDeadlineDays: number;
    streakReminderTime: string;
};

type ProfileFields = {
    username: string;
    email: string;
};

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const SETTINGS_STORAGE_KEY = "transition-settings-v1";

const DEFAULT_SETTINGS: PreferenceSettings = {
    darkMode: true,
    syncOnMobileData: true,
    notifications: {
        taskReminders: true,
        streakAlerts: true,
        achievementUnlocks: false,
    },
    whatsappPaired: false,
    preDeadlineDays: 2,
    streakReminderTime: "09:00",
};

function generatePairingCode(): string {
    return `PAIR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function getLocalSettings(): PreferenceSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;

    try {
        const parsed = JSON.parse(saved) as Partial<PreferenceSettings>;
        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            notifications: {
                ...DEFAULT_SETTINGS.notifications,
                ...(parsed.notifications || {}),
            },
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SettingsPage() {
    const { toast } = useToast();
    const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

    const user = profileData?.user;
    const [profileFields, setProfileFields] = React.useState<ProfileFields>({ username: "", email: "" });
    const [goalDraft, setGoalDraft] = React.useState<number>(4);
    const [activeAction, setActiveAction] = React.useState<"profile" | "goal" | null>(null);

    const [settings, setSettings] = React.useState<PreferenceSettings>(DEFAULT_SETTINGS);
    const [pairingCode, setPairingCode] = React.useState<string>(() => generatePairingCode());
    const [online, setOnline] = React.useState<boolean>(true);
    const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);

    React.useEffect(() => {
        if (!user) return;
        setProfileFields({
            username: user.username || "",
            email: user.email || "",
        });
        setGoalDraft(user.dailyGoalHours || 4);
    }, [user]);

    React.useEffect(() => {
        setSettings(getLocalSettings());
        setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }, []);

    React.useEffect(() => {
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);

        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, []);

    React.useEffect(() => {
        document.documentElement.classList.toggle("dark", settings.darkMode);
    }, [settings.darkMode]);

    const persistSettings = React.useCallback((next: PreferenceSettings) => {
        setSettings(next);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        setLastSavedAt(new Date());
    }, []);

    const updateLocalSettings = <K extends keyof PreferenceSettings>(key: K, value: PreferenceSettings[K]) => {
        persistSettings({ ...settings, [key]: value });
    };

    const updateNotificationSettings = (key: keyof NotificationSettings, value: boolean) => {
        persistSettings({
            ...settings,
            notifications: {
                ...settings.notifications,
                [key]: value,
            },
        });
    };

    const pendingChanges =
        (user?.username !== profileFields.username.trim() ? 1 : 0) +
        (user?.email !== profileFields.email.trim() ? 1 : 0) +
        ((user?.dailyGoalHours || 4) !== goalDraft ? 1 : 0);

    const handleProfileUpdate = async () => {
        const username = profileFields.username.trim();
        const email = profileFields.email.trim();

        if (!username) {
            toast("Username cannot be empty", "error");
            return;
        }
        if (!isValidEmail(email)) {
            toast("Please enter a valid email", "error");
            return;
        }
        if (user?.username === username && user?.email === email) {
            toast("No profile changes to save", "info");
            return;
        }

        try {
            setActiveAction("profile");
            await updateProfile({ username, email }).unwrap();
            toast("Profile updated successfully", "success");
        } catch {
            toast("Failed to update profile", "error");
        } finally {
            setActiveAction(null);
        }
    };

    const handleDailyGoalSave = async () => {
        if ((user?.dailyGoalHours || 4) === goalDraft) {
            toast("Daily goal is already up to date", "info");
            return;
        }

        try {
            setActiveAction("goal");
            await updateProfile({ dailyGoalHours: goalDraft }).unwrap();
            toast("Daily focus goal updated", "success");
        } catch {
            toast("Failed to update daily goal", "error");
        } finally {
            setActiveAction(null);
        }
    };

    const handleCopyPairingCode = async () => {
        try {
            await navigator.clipboard.writeText(pairingCode);
            toast("Pairing code copied", "success");
        } catch {
            toast("Failed to copy pairing code", "error");
        }
    };

    const handlePairWhatsapp = async () => {
        try {
            await navigator.clipboard.writeText(pairingCode);
            updateLocalSettings("whatsappPaired", true);
            toast("WhatsApp pairing simulated. Replace with real backend integration.", "success");
        } catch {
            toast("Unable to pair right now", "error");
        }
    };

    const handleRegenerateCode = () => {
        const nextCode = generatePairingCode();
        setPairingCode(nextCode);
        toast("New pairing code generated", "success");
    };

    if (isProfileLoading) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_40%),linear-gradient(140deg,_#020617_0%,_#0f172a_40%,_#111827_100%)] p-6 md:p-8 space-y-6">
                <Skeleton className="h-10 w-1/3 bg-white/5" />
                <Skeleton className="h-6 w-1/2 bg-white/5" />
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
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
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                    <Skeleton className="h-16 w-full bg-white/5" />
                    <Skeleton className="h-16 w-full bg-white/5" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.10),_transparent_35%),linear-gradient(140deg,_#020617_0%,_#0f172a_40%,_#111827_100%)] text-white p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-fuchsia-500/10 p-6 md:p-8">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute -left-16 -bottom-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-cyan-200">
                                <Sparkles className="w-3.5 h-3.5" />
                                Smart configuration center
                            </p>
                            <h1 className="mt-3 text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">
                                Settings & Integrations
                            </h1>
                            <p className="text-slate-300 mt-2 max-w-2xl">
                                Manage profile, notifications, pairing, and productivity preferences in one place.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                            <div className="rounded-xl border border-white/20 bg-black/20 p-3">
                                <div className="text-xs text-slate-400">Sync</div>
                                <div className={`text-sm font-bold ${online ? "text-emerald-300" : "text-amber-300"}`}>
                                    {online ? "Online" : "Offline"}
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-black/20 p-3">
                                <div className="text-xs text-slate-400">Pending</div>
                                <div className="text-sm font-bold text-cyan-200">{pendingChanges}</div>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-black/20 p-3">
                                <div className="text-xs text-slate-400">Theme</div>
                                <div className="text-sm font-bold text-fuchsia-200">{settings.darkMode ? "Dark" : "Light"}</div>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-black/20 p-3">
                                <div className="text-xs text-slate-400">WhatsApp</div>
                                <div className={`text-sm font-bold ${settings.whatsappPaired ? "text-green-300" : "text-slate-300"}`}>
                                    {settings.whatsappPaired ? "Paired" : "Not paired"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <User className="w-5 h-5 text-cyan-300" />
                            <h2 className="text-xl font-bold text-white">Profile Information</h2>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-5 mb-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold uppercase">
                                {user?.username?.[0] || "U"}
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-bold text-xl">{user?.username}</div>
                                <div className="text-slate-400">{user?.email}</div>
                                <div className="text-xs text-slate-500 mt-1">Account created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "--"}</div>
                            </div>
                            <button
                                onClick={handleProfileUpdate}
                                disabled={isUpdating && activeAction === "profile"}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg border border-cyan-400/20 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isUpdating && activeAction === "profile" && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Profile
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={profileFields.username}
                                    onChange={(e) => setProfileFields((prev) => ({ ...prev, username: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={profileFields.email}
                                    onChange={(e) => setProfileFields((prev) => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Palette className="w-5 h-5 text-fuchsia-300" />
                            <h2 className="text-xl font-bold text-white">Core Preferences</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                <div>
                                    <div className="text-white font-medium">Dark Mode</div>
                                    <div className="text-sm text-slate-400">Toggle visual theme preference</div>
                                </div>
                                <button
                                    onClick={() => updateLocalSettings("darkMode", !settings.darkMode)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.darkMode ? "bg-cyan-500" : "bg-white/20"}`}
                                >
                                    <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${settings.darkMode ? "left-[22px]" : "left-[2px]"}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                <div>
                                    <div className="text-white font-medium">Sync on Mobile Data</div>
                                    <div className="text-sm text-slate-400">Allow sync when Wi-Fi is unavailable</div>
                                </div>
                                <button
                                    onClick={() => updateLocalSettings("syncOnMobileData", !settings.syncOnMobileData)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.syncOnMobileData ? "bg-cyan-500" : "bg-white/20"}`}
                                >
                                    <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${settings.syncOnMobileData ? "left-[22px]" : "left-[2px]"}`} />
                                </button>
                            </div>

                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                <div className="text-white font-medium">Daily Focus Goal</div>
                                <div className="text-sm text-slate-400 mb-3">Target focus hours used in analytics and reminders</div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={goalDraft}
                                        onChange={(e) => setGoalDraft(Number(e.target.value))}
                                        className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        {GOAL_OPTIONS.map((hours) => (
                                            <option key={hours} value={hours} className="bg-slate-900">
                                                {hours} {hours === 1 ? "hour" : "hours"}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleDailyGoalSave}
                                        disabled={isUpdating && activeAction === "goal"}
                                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg border border-cyan-400/20 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                                    >
                                        {isUpdating && activeAction === "goal" && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-5 h-5 text-indigo-300" />
                        <h2 className="text-xl font-bold text-white">Notifications</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">Task Reminders</div>
                                <div className="text-xs text-slate-400">Upcoming task nudges</div>
                            </div>
                            <button
                                onClick={() => updateNotificationSettings("taskReminders", !settings.notifications.taskReminders)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${settings.notifications.taskReminders ? "bg-indigo-500" : "bg-white/20"}`}
                            >
                                <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${settings.notifications.taskReminders ? "left-[22px]" : "left-[2px]"}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">Streak Alerts</div>
                                <div className="text-xs text-slate-400">Habit continuity reminders</div>
                            </div>
                            <button
                                onClick={() => updateNotificationSettings("streakAlerts", !settings.notifications.streakAlerts)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${settings.notifications.streakAlerts ? "bg-indigo-500" : "bg-white/20"}`}
                            >
                                <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${settings.notifications.streakAlerts ? "left-[22px]" : "left-[2px]"}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">Achievement Unlocks</div>
                                <div className="text-xs text-slate-400">Milestone celebration alerts</div>
                            </div>
                            <button
                                onClick={() => updateNotificationSettings("achievementUnlocks", !settings.notifications.achievementUnlocks)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${settings.notifications.achievementUnlocks ? "bg-indigo-500" : "bg-white/20"}`}
                            >
                                <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${settings.notifications.achievementUnlocks ? "left-[22px]" : "left-[2px]"}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <MessageSquare className="w-5 h-5 text-green-400" />
                        <h2 className="text-xl font-bold text-white">WhatsApp Bot</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <Smartphone className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <div className="text-white font-medium">Nudge Notifications</div>
                                    <div className="text-sm text-slate-400">Receive reminders and streak alerts via WhatsApp</div>
                                </div>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${settings.whatsappPaired ? "bg-green-500/20 text-green-300" : "bg-white/5 text-slate-300"}`}>
                                {settings.whatsappPaired ? "Paired" : "Not Paired"}
                            </span>
                        </div>

                        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                            <p className="text-sm text-slate-300 mb-3">Pairing flow (placeholder integration):</p>
                            <ol className="text-sm text-slate-400 space-y-1.5 list-decimal list-inside">
                                <li>Save <span className="text-green-400 font-mono">+91 XXXX-XXXX</span> as Study Bot</li>
                                <li>Send the generated code to the bot</li>
                                <li>Confirm in app to activate WhatsApp reminders</li>
                            </ol>
                            <div className="mt-3 flex flex-col md:flex-row md:items-center gap-3">
                                <code className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-green-400 font-mono text-lg tracking-widest">{pairingCode}</code>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyPairingCode}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-colors inline-flex items-center gap-2"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </button>
                                    <button
                                        onClick={handleRegenerateCode}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-colors"
                                    >
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={handlePairWhatsapp}
                                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm border border-green-400/20 transition-colors"
                                    >
                                        Mark Paired
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-green-400" />
                                <span className="text-white font-medium">Smart Nudge Schedule</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                                    <div>
                                        <div className="text-sm text-white">Pre-deadline reminder</div>
                                        <div className="text-xs text-slate-400">Days before due date</div>
                                    </div>
                                    <select
                                        value={settings.preDeadlineDays}
                                        onChange={(e) => updateLocalSettings("preDeadlineDays", Number(e.target.value))}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-500"
                                    >
                                        {[1, 2, 3, 5].map((days) => (
                                            <option key={days} value={days} className="bg-slate-900">
                                                {days} {days === 1 ? "day" : "days"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                                    <div>
                                        <div className="text-sm text-white">Streak reminder</div>
                                        <div className="text-xs text-slate-400">Daily reminder time</div>
                                    </div>
                                    <input
                                        type="time"
                                        value={settings.streakReminderTime}
                                        onChange={(e) => updateLocalSettings("streakReminderTime", e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Languages className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">Language & Region</h2>
                        </div>
                        <LanguageSelector />
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Moon className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">Quiet Hours</h2>
                        </div>
                        <QuietHoursPanel />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Wifi className={`w-5 h-5 ${online ? "text-green-400" : "text-amber-400"}`} />
                        <h2 className="text-xl font-bold text-white">Sync Status</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-xs text-slate-400">Connection</div>
                            <div className={`text-lg font-bold ${online ? "text-emerald-300" : "text-amber-300"}`}>
                                {online ? "Connected" : "Offline"}
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-xs text-slate-400">Pending Changes</div>
                            <div className="text-lg font-bold text-cyan-200">{pendingChanges}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-xs text-slate-400">Last Local Save</div>
                            <div className="text-sm font-bold text-slate-200">
                                {lastSavedAt ? lastSavedAt.toLocaleTimeString() : "No local changes yet"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <CreditCard className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-xl font-bold text-white">Premium Upgrade</h2>
                        </div>
                        <PricingSection />
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <QrCode className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">QR Attendance</h2>
                        </div>
                        <QRAttendance />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">Security</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            href="/forgot-password"
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors text-center"
                        >
                            Reset Password
                        </Link>
                        <button
                            onClick={() => toast("2FA setup UI will be connected after backend support", "info")}
                            className="px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded-lg border border-cyan-400/30 transition-colors inline-flex items-center justify-center gap-2"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Enable 2FA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
