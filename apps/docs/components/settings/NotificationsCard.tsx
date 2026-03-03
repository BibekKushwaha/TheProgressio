"use client";

import { Bell, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    useGetNotificationIntelligenceQuery,
    useGetNotificationContextSignalsQuery,
    NotificationSettings,
} from "@repo/store";
import { useNotificationSettingsController } from "@/hooks/useNotificationSettingsController";

type BucketKey = keyof NotificationSettings['enabledBuckets'];

const NOTIFICATION_BUCKETS: Array<{ key: BucketKey; title: string; description: string }> = [
    { key: "URGENCY_DRIVEN", title: "Deadline Alerts", description: "Urgency-driven reminders for upcoming conflicts" },
    { key: "MORNING_BRIEFING", title: "Morning Briefing", description: "Top 3 priorities and schedule context" },
    { key: "BEHAVIORAL_NUDGE", title: "Behavioral Nudges", description: "Gentle check-ins for streaks and routines" },
    { key: "ADVANCE_ALERT_3WEEK", title: "Exam Advance Alerts", description: "3-week, 1-week, and 3-day reminders" },
    { key: "TRANSACTION_SYSTEM", title: "System Updates", description: "Attendance, sync, and confirmation updates" },
];

export function NotificationsCard() {
    const {
        nudgeSettings,
        isUpdatingNudgeSettings,
        preDeadlineSelectValue,
        streakReminderSelectValue,
        toggleBucket,
        toggleGroupedSummaries,
        togglePositiveTone,
        handlePreDeadlineChange,
        handleStreakReminderChange,
    } = useNotificationSettingsController();

    const { data: intelligenceData } = useGetNotificationIntelligenceQuery();
    const { data: contextSignals } = useGetNotificationContextSignalsQuery({
        locationTag: "CAMPUS",
        motionState: "WALKING",
        brightness: 0.7,
    });

    return (
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
                            onCheckedChange={(checked) => toggleBucket(item.key, checked)}
                        />
                    </div>
                ))}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <Label className="text-sm text-slate-300">Grouped summaries / digests</Label>
                        <Switch
                            checked={Boolean(nudgeSettings?.groupedSummaries)}
                            onCheckedChange={toggleGroupedSummaries}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <Label className="text-sm text-slate-300">Positive motivation tone</Label>
                        <Switch
                            checked={Boolean(nudgeSettings?.positiveTone)}
                            onCheckedChange={togglePositiveTone}
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
                                <Select value={preDeadlineSelectValue} onValueChange={handlePreDeadlineChange} disabled={isUpdatingNudgeSettings}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <Select value={streakReminderSelectValue} onValueChange={handleStreakReminderChange} disabled={isUpdatingNudgeSettings}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
    );
}
