'use client';

import { useState, useEffect } from 'react';
import { Bell, Moon, Clock, ChevronDown, Sparkles } from 'lucide-react';
import { useGetNudgeSettingsQuery, useUpdateNudgeSettingsMutation } from '@repo/store';
import { toast } from 'sonner';
import { TimePickerInput } from '@/components/ui/time-picker-input';

interface QuietHoursSettings {
    enabled: boolean;
    startTime: string;
    endTime: string;
    gentleNudges: boolean;
    snoozeMinutes: number;
}

export function QuietHoursPanel() {
    const { data } = useGetNudgeSettingsQuery();
    const [updateNudgeSettings] = useUpdateNudgeSettingsMutation();
    const [settings, setSettings] = useState<QuietHoursSettings>({
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        gentleNudges: true,
        snoozeMinutes: 15,
    });

    const [isExpanded, setIsExpanded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const firstWindow = data?.settings?.quietHours?.[0];
        if (!firstWindow) return;

        setSettings((prev) => ({
            ...prev,
            enabled: true,
            startTime: firstWindow.start,
            endTime: firstWindow.end,
            gentleNudges: Boolean(data?.settings?.positiveTone),
        }));
    }, [data?.settings]);

    // Save to localStorage on change
    const update = <K extends keyof QuietHoursSettings>(key: K, value: QuietHoursSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        const effectiveQuietHours = newSettings.enabled
            ? [{ start: newSettings.startTime, end: newSettings.endTime }]
            : [];

        updateNudgeSettings({
            quietHours: effectiveQuietHours,
            positiveTone: newSettings.gentleNudges,
        }).unwrap().then(() => {
            if (key === 'enabled') {
                toast.success(value ? "Quiet hours enabled" : "Quiet hours disabled");
            } else if (key === 'gentleNudges') {
                toast.success(value ? "Gentle nudges enabled" : "Gentle nudges disabled");
            } else if (key === 'snoozeMinutes') {
                toast.success(`Snooze duration set to ${value}m`);
            }
        }).catch((error) => {
            console.error('Failed to persist quiet hour settings', error);
            toast.error("Failed to update settings");
        });

        if (typeof window !== 'undefined') {
            localStorage.setItem('quiet-hours-settings', JSON.stringify(newSettings));
        }
    };

    const SNOOZE_OPTIONS = [5, 10, 15, 30, 60];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600/40 to-purple-500/40 rounded-xl flex items-center justify-center">
                        <Moon className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Quiet Hours & Reminders</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {settings.enabled
                                ? `Silent ${settings.startTime} – ${settings.endTime}`
                                : 'All notifications active'}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expandable content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 space-y-6 border-t border-white/10 pt-6">

                    {/* Quiet Hours Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Moon className="w-4 h-4 text-indigo-400" />
                            <div>
                                <p className="text-sm font-semibold text-white">Quiet Hours</p>
                                <p className="text-xs text-slate-500">Pause notifications during sleep</p>
                            </div>
                        </div>
                        <button
                            onClick={() => update('enabled', !settings.enabled)}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.enabled ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-white/20'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Time Range */}
                    {settings.enabled && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">From</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <TimePickerInput
                                        value={settings.startTime}
                                        onChange={(nextTime) => update('startTime', nextTime)}
                                        className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">To</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <TimePickerInput
                                        value={settings.endTime}
                                        onChange={(nextTime) => update('endTime', nextTime)}
                                        className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-white/5" />

                    {/* Gentle Nudges */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <div>
                                <p className="text-sm font-semibold text-white">Gentle Nudges</p>
                                <p className="text-xs text-slate-500">Soft reminders instead of intrusive alerts</p>
                            </div>
                        </div>
                        <button
                            onClick={() => update('gentleNudges', !settings.gentleNudges)}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.gentleNudges ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-white/20'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.gentleNudges ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Snooze Duration */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Bell className="w-4 h-4 text-blue-400" />
                            <p className="text-sm font-semibold text-white">Snooze Duration</p>
                        </div>
                        <div className="flex gap-2">
                            {SNOOZE_OPTIONS.map((mins) => (
                                <button
                                    key={mins}
                                    onClick={() => update('snoozeMinutes', mins)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${settings.snoozeMinutes === mins
                                        ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 text-blue-300'
                                        : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
