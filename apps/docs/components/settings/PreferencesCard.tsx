"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useAccountSettingsController } from "@/hooks/useAccountSettingsController";

export function PreferencesCard() {
    const { theme, setTheme } = useTheme();
    const { dailyGoalHours, isUpdating, handleDailyGoalChange } = useAccountSettingsController();

    return (
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
                                value={`${dailyGoalHours} hours`}
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
    );
}
