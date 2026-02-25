"use client";

import React, { useState, useEffect } from "react";
import { User, Bell, Lock, Palette, Loader2, Moon, Wifi, MessageSquare, Smartphone, CreditCard, Clock, QrCode, Languages } from "lucide-react";
import {
    useGetProfileQuery,
    useUpdateProfileMutation,
    useGetNudgeSettingsQuery,
    useUpdateNudgeSettingsMutation,
    useGetNotificationIntelligenceQuery,
    useGetNotificationContextSignalsQuery,
    useGetWhatsAppPairingCodeQuery,
    useUnpairWhatsAppMutation,
    NotificationSettings,
} from "@repo/store";
import { QuietHoursPanel } from "@/components/settings/QuietHoursPanel";
import { PricingSection } from "@/components/settings/PricingSection";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { QRAttendance } from "@/components/settings/QRAttendance";
import { FamilyShareManagement } from "@/components/settings/FamilyShareManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useTheme } from "next-themes";
import { toast } from "sonner";

type BucketKey = keyof NotificationSettings['enabledBuckets'];

const NOTIFICATION_BUCKETS: Array<{ key: BucketKey; title: string; description: string }> = [
    { key: "URGENCY_DRIVEN", title: "Deadline Alerts", description: "Urgency-driven reminders for upcoming conflicts" },
    { key: "MORNING_BRIEFING", title: "Morning Briefing", description: "Top 3 priorities and schedule context" },
    { key: "BEHAVIORAL_NUDGE", title: "Behavioral Nudges", description: "Gentle check-ins for streaks and routines" },
    { key: "ADVANCE_ALERT_3WEEK", title: "Exam Advance Alerts", description: "3-week, 1-week, and 3-day reminders" },
    { key: "TRANSACTION_SYSTEM", title: "System Updates", description: "Attendance, sync, and confirmation updates" },
];

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const { data: nudgeSettingsData } = useGetNudgeSettingsQuery();
    const [updateNudgeSettings, { isLoading: isUpdatingNudgeSettings }] = useUpdateNudgeSettingsMutation();
    const { data: intelligenceData } = useGetNotificationIntelligenceQuery();
    const { data: contextSignals } = useGetNotificationContextSignalsQuery({ locationTag: "CAMPUS", motionState: "WALKING", brightness: 0.7 });
    const [isPairingPolling, setIsPairingPolling] = useState(true);
    const { data: pairingData, isLoading: isPairingLoading, refetch: refetchPairing } = useGetWhatsAppPairingCodeQuery(undefined, {
        pollingInterval: isPairingPolling ? 5000 : 0,
        refetchOnMountOrArgChange: true,
    });
    const [unpairWhatsApp, { isLoading: isUnpairing }] = useUnpairWhatsAppMutation();

    // Stop polling once the WhatsApp number is verified
    useEffect(() => {
        if (pairingData?.verified) setIsPairingPolling(false);
    }, [pairingData?.verified]);

    const whatsAppBotNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER;
    const whatsAppBotNumberDigits = whatsAppBotNumber ? whatsAppBotNumber.replace(/[^\d]/g, "") : "";
    const whatsAppPairingLink =
        whatsAppBotNumberDigits && pairingData?.pairingCode
            ? `https://wa.me/${whatsAppBotNumberDigits}?text=${encodeURIComponent(pairingData.pairingCode)}`
            : null;

    const user = profileData?.user;
    const nudgeSettings = nudgeSettingsData?.settings;
    const preDeadlineSelectValue = `${nudgeSettings?.preDeadlineDays ?? 2} ${((nudgeSettings?.preDeadlineDays ?? 2) === 1) ? "day" : "days"}`;
    const streakReminderSelectValue = (() => {
        const value = nudgeSettings?.streakReminderTime ?? "09:00";
        if (value === "08:00") return "8:00 AM";
        if (value === "18:00") return "6:00 PM";
        return "9:00 AM";
    })();

    const handleDailyGoalChange = async (val: string) => {
        const value = parseFloat(val.split(" ")[0] || "4");
        try {
            await updateProfile({ dailyGoalHours: value }).unwrap();
            toast.success(`Daily goal updated to ${value} hours`);
        } catch (error) {
            console.error("Failed to update daily goal:", error);
            toast.error("Failed to update daily goal");
        }
    };

    const [profileFields, setProfileFields] = React.useState({
        username: "",
        email: ""
    });

    useEffect(() => {
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
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error("Failed to update profile");
        }
    };

    const copyPairingCode = () => {
        if (pairingData?.pairingCode) {
            navigator.clipboard.writeText(pairingData.pairingCode);
            toast.success("Pairing code copied to clipboard");
        }
    };

    const handlePreDeadlineChange = async (value: string) => {
        const match = value.match(/^([1-3])\sday(s)?$/);
        const days = Number(match?.[1] ?? "2") as 1 | 2 | 3;
        const timezoneOffsetMinutes = new Date().getTimezoneOffset();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        try {
            await updateNudgeSettings({ preDeadlineDays: days, timezone, timezoneOffsetMinutes }).unwrap();
            toast.success("Pre-deadline reminder updated");
        } catch (_error) {
            toast.error("Failed to update pre-deadline reminder");
        }
    };

    const handleStreakReminderChange = async (value: string) => {
        const mapping: Record<string, string> = {
            "8:00 AM": "08:00",
            "9:00 AM": "09:00",
            "6:00 PM": "18:00",
        };
        const reminderTime = mapping[value] ?? "09:00";
        const timezoneOffsetMinutes = new Date().getTimezoneOffset();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        try {
            await updateNudgeSettings({ streakReminderTime: reminderTime, timezone, timezoneOffsetMinutes }).unwrap();
            toast.success("Streak reminder time updated");
        } catch (_error) {
            toast.error("Failed to update streak reminder time");
        }
    };

    if (isProfileLoading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Settings & Integrations"
                    subtitle="Customize your experience, manage integrations, and configure quiet hours."
                />
                <Card variant="glass">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Skeleton className="w-20 h-20 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Settings & Integrations"
                subtitle="Customize your experience, manage integrations, and configure quiet hours."
            />

            {/* Profile Section */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Profile Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-3xl font-bold uppercase shrink-0">
                            {user?.username?.[0] || "U"}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="text-xl font-bold">{user?.username}</div>
                            <div className="text-slate-400">{user?.email}</div>
                        </div>

                    </div>

                    <Separator className="bg-white/10" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={profileFields.username}
                                onChange={(e) => setProfileFields(prev => ({ ...prev, username: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileFields.email}
                                onChange={(e) => setProfileFields(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>

                        <Button
                            onClick={handleProfileUpdate}
                            disabled={isUpdating}
                            className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto lg:text-center"
                        >
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preferences */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Preferences</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="space-y-0.5">
                            <Label className="text-base">Dark Mode</Label>
                            <p className="text-sm text-slate-400">Use dark theme across the app</p>
                        </div>
                        <Switch
                            checked={theme === 'dark'}
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="space-y-0.5">
                            <Label className="text-base">Daily Goal</Label>
                            <p className="text-sm text-slate-400">Set your daily focus time goal</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isUpdating && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                            <div className="w-[140px]">
                                <Select
                                    value={`${user?.dailyGoalHours || 4} hours`}
                                    onValueChange={handleDailyGoalChange}
                                    disabled={isUpdating}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select goal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                                            <SelectItem key={h} value={`${h} hours`} className="cursor-pointer">{h} hours</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Language & Region */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Languages className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Language & Region</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <LanguageSelector />
                </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Quiet Hours</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <QuietHoursPanel />
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Notifications</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {NOTIFICATION_BUCKETS.map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-base">{item.title}</Label>
                                <p className="text-sm text-slate-400">{item.description}</p>
                            </div>
                            <Switch
                                checked={Boolean(nudgeSettings?.enabledBuckets?.[item.key])}
                                onCheckedChange={async (checked) => {
                                    try {
                                        await updateNudgeSettings({
                                            enabledBuckets: {
                                                ...(nudgeSettings?.enabledBuckets ?? {
                                                    URGENCY_DRIVEN: true,
                                                    MORNING_BRIEFING: true,
                                                    BEHAVIORAL_NUDGE: true,
                                                    ADVANCE_ALERT_3WEEK: true,
                                                    TRANSACTION_SYSTEM: true,
                                                }),
                                                [item.key]: checked,
                                            },
                                        }).unwrap();
                                        toast.success("Notification setting updated");
                                    } catch (error) {
                                        console.error("Failed to update notification bucket setting:", error);
                                        toast.error("Failed to update setting");
                                    }
                                }}
                            />
                        </div>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <Label className="text-sm text-slate-300">Grouped summaries / digests</Label>
                            <Switch
                                checked={Boolean(nudgeSettings?.groupedSummaries)}
                                onCheckedChange={async (checked) => {
                                    try {
                                        await updateNudgeSettings({ groupedSummaries: checked }).unwrap();
                                        toast.success("Digest settings updated");
                                    } catch (error) {
                                        console.error("Failed to update grouped summaries:", error);
                                        toast.error("Failed to update setting");
                                    }
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                            <Label className="text-sm text-slate-300">Positive motivation tone</Label>
                            <Switch
                                checked={Boolean(nudgeSettings?.positiveTone)}
                                onCheckedChange={async (checked) => {
                                    try {
                                        await updateNudgeSettings({ positiveTone: checked }).unwrap();
                                        toast.success("Motivation tone updated");
                                    } catch (error) {
                                        console.error("Failed to update positive tone setting:", error);
                                        toast.error("Failed to update setting");
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg space-y-2">
                        <div className="font-medium text-indigo-300">Behavioral Intelligence</div>
                        <div className="text-sm text-slate-300">
                            Best send window: <span className="text-white font-semibold">{intelligenceData?.intelligence?.bestSendWindow ?? 'Loading...'}</span>
                        </div>
                        <div className="text-sm text-slate-400">
                            Expected open-rate lift: {intelligenceData?.intelligence?.expectedOpenRateLiftPct ?? 0}% · Confidence: {intelligenceData?.intelligence?.confidence ?? 'low'}
                        </div>
                        <div className="text-xs text-slate-400/80">
                            Active context: {contextSignals?.context?.screenActive ? 'Device active' : 'Quiet context'} · Non-urgent suppressed: {contextSignals?.context?.suppressNonUrgent ? 'Yes' : 'No'}
                        </div>
                    </div>

                    {isUpdatingNudgeSettings && (
                        <div className="text-xs text-indigo-300 animate-pulse">Saving notification settings...</div>
                    )}
                </CardContent>
            </Card>

            {/* Sync Status */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-green-400" />
                        <CardTitle>Sync Status</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                            <div>
                                <div className="font-medium">Local-First Sync</div>
                                <div className="text-sm text-slate-400">All data is synced and up to date</div>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            Connected
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div>
                            <div className="font-medium">Pending Changes</div>
                            <div className="text-sm text-slate-400">Changes waiting to be synced to cloud</div>
                        </div>
                        <span className="text-lg font-mono font-bold text-slate-300">0</span>
                    </div>
                </CardContent>
            </Card>

            {/* WhatsApp Bot Pairing */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-green-400" />
                        <CardTitle>WhatsApp Bot</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${pairingData?.verified ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400'}`}>
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="font-medium">Nudge Notifications</div>
                                <div className="text-sm text-slate-400">
                                    {pairingData?.verified
                                        ? `Paired with ${pairingData.whatsappNumber || 'your number'}`
                                        : 'Receive study reminders and streak alerts'
                                    }
                                </div>
                            </div>
                        </div>
                        <div className={`text-xs font-semibold px-3 py-1 rounded-full ${pairingData?.verified ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-slate-400 bg-white/10'}`}>
                            {pairingData?.verified ? 'Paired' : 'Not Paired'}
                        </div>
                    </div>

                    {!pairingData?.verified && (
                        <div className="p-6 bg-green-950/20 border border-green-500/20 rounded-xl space-y-4">
                            <div className="text-sm text-slate-300 font-medium">To pair your WhatsApp:</div>
                            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside pl-2">
                                <li>Save <span className="text-green-400 font-mono bg-green-950/40 px-1 rounded">{whatsAppBotNumber ?? 'the bot number'}</span> as &quot;Study Bot&quot;</li>
                                <li>Send the pairing code below to the bot</li>
                                <li>You&apos;ll receive a confirmation message</li>
                            </ol>
                            {!whatsAppBotNumber && (
                                <div className="text-xs text-amber-300/90">
                                    Missing <span className="font-mono">NEXT_PUBLIC_WHATSAPP_BOT_NUMBER</span>. Set it in <span className="font-mono">apps/docs/.env.local</span> to show the bot number and enable the one-click WhatsApp link.
                                </div>
                            )}
                            <div className="flex items-center gap-3 pt-2">
                                <code className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-green-400 font-mono text-lg tracking-widest text-center">
                                    {isPairingLoading ? "Generating..." : (pairingData?.pairingCode || "Code unavailable")}
                                </code>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 h-full"
                                    onClick={copyPairingCode}
                                    disabled={isPairingLoading || !pairingData?.pairingCode}
                                >
                                    Copy Code
                                </Button>
                            </div>
                            <Button
                                asChild={Boolean(whatsAppPairingLink)}
                                className="bg-green-600/80 hover:bg-green-700 disabled:opacity-50"
                                disabled={!whatsAppPairingLink}
                            >
                                {whatsAppPairingLink ? (
                                    <a href={whatsAppPairingLink} target="_blank" rel="noreferrer">
                                        Open WhatsApp
                                    </a>
                                ) : (
                                    <span>Open WhatsApp</span>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs border-white/10 text-slate-400 hover:text-slate-200"
                                onClick={() => refetchPairing()}
                                disabled={isPairingLoading}
                            >
                                {isPairingLoading ? "Checking..." : "Refresh Pairing Status"}
                            </Button>
                        </div>
                    )}

                    {pairingData?.verified && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-between">
                            <div className="text-sm text-indigo-300">
                                <span className="font-medium">Active Assistant:</span> My Study Bot
                            </div>
                            <Button
                                variant="ghost"
                                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                onClick={async () => {
                                    try {
                                        await unpairWhatsApp().unwrap();
                                        setIsPairingPolling(true);  // resume polling so new pairing code is detected
                                        await refetchPairing();
                                        toast.success("WhatsApp account unpaired");
                                    } catch (_err) {
                                        toast.error("Failed to unpair WhatsApp");
                                    }
                                }}
                                disabled={isUnpairing}
                            >
                                {isUnpairing ? "Unpairing..." : "Unpair"}
                            </Button>
                        </div>
                    )}

                    <Separator className="bg-white/10" />

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-400" />
                            <span className="font-medium">Smart Nudge Schedule</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                <div>
                                    <div className="text-sm font-medium">Pre-deadline</div>
                                    <div className="text-xs text-slate-400">Days before due date</div>
                                </div>
                                <div className="w-[100px]">
                                    <Select
                                        value={preDeadlineSelectValue}
                                        onValueChange={handlePreDeadlineChange}
                                        disabled={isUpdatingNudgeSettings}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1 day">1 day</SelectItem>
                                            <SelectItem value="2 days">2 days</SelectItem>
                                            <SelectItem value="3 days">3 days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                <div>
                                    <div className="text-sm font-medium">Streak check</div>
                                    <div className="text-xs text-slate-400">Daily reminder time</div>
                                </div>
                                <div className="w-[110px]">
                                    <Select
                                        value={streakReminderSelectValue}
                                        onValueChange={handleStreakReminderChange}
                                        disabled={isUpdatingNudgeSettings}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="8:00 AM">8:00 AM</SelectItem>
                                            <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                                            <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Premium Upgrade */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-yellow-400" />
                        <CardTitle>Premium Upgrade</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <PricingSection />
                </CardContent>
            </Card>

            {/* Family & Mentor Sharing */}
            <FamilyShareManagement />

            {/* QR Attendance */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        <CardTitle>QR Attendance</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <QRAttendance />
                </CardContent>
            </Card>

            {/* Security */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Security</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="w-full md:w-auto border-white/10 hover:bg-white/5"
                        onClick={() => toast.info("Password change feature is coming soon")}
                    >
                        Change Password
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
