'use client';

import { useGetNudgeSettingsQuery, useUpdateNudgeSettingsMutation, NotificationSettings } from '@repo/store';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/api-error';

type BucketKey = keyof NotificationSettings['enabledBuckets'];

const DEFAULT_ENABLED_BUCKETS: NotificationSettings['enabledBuckets'] = {
    URGENCY_DRIVEN: true,
    MORNING_BRIEFING: true,
    BEHAVIORAL_NUDGE: true,
    ADVANCE_ALERT_3WEEK: true,
    TRANSACTION_SYSTEM: true,
};

export function useNotificationSettingsController() {
    const { data: nudgeSettingsData } = useGetNudgeSettingsQuery();
    const [updateNudgeSettings, { isLoading: isUpdatingNudgeSettings }] = useUpdateNudgeSettingsMutation();

    const nudgeSettings = nudgeSettingsData?.settings;

    const preDeadlineSelectValue = `${nudgeSettings?.preDeadlineDays ?? 2} ${((nudgeSettings?.preDeadlineDays ?? 2) === 1) ? 'day' : 'days'}`;
    const streakReminderSelectValue = (() => {
        const value = nudgeSettings?.streakReminderTime ?? '09:00';
        if (value === '08:00') return '8:00 AM';
        if (value === '18:00') return '6:00 PM';
        return '9:00 AM';
    })();

    const toggleBucket = async (bucketKey: BucketKey, checked: boolean) => {
        try {
            await updateNudgeSettings({
                enabledBuckets: {
                    ...(nudgeSettings?.enabledBuckets ?? DEFAULT_ENABLED_BUCKETS),
                    [bucketKey]: checked,
                },
            }).unwrap();
            toast.success('Notification setting updated');
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to update setting');
        }
    };

    const toggleGroupedSummaries = async (checked: boolean) => {
        try {
            await updateNudgeSettings({ groupedSummaries: checked }).unwrap();
            toast.success('Digest settings updated');
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to update setting');
        }
    };

    const togglePositiveTone = async (checked: boolean) => {
        try {
            await updateNudgeSettings({ positiveTone: checked }).unwrap();
            toast.success('Motivation tone updated');
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to update setting');
        }
    };

    const handlePreDeadlineChange = async (value: string) => {
        const match = value.match(/^([1-3])\sday(s)?$/);
        const days = Number(match?.[1] ?? '2') as 1 | 2 | 3;
        const timezoneOffsetMinutes = new Date().getTimezoneOffset();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        try {
            await updateNudgeSettings({ preDeadlineDays: days, timezone, timezoneOffsetMinutes }).unwrap();
            toast.success('Pre-deadline reminder updated');
        } catch {
            toast.error('Failed to update pre-deadline reminder');
        }
    };

    const handleStreakReminderChange = async (value: string) => {
        const mapping: Record<string, string> = {
            '8:00 AM': '08:00',
            '9:00 AM': '09:00',
            '6:00 PM': '18:00',
        };
        const reminderTime = mapping[value] ?? '09:00';
        const timezoneOffsetMinutes = new Date().getTimezoneOffset();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        try {
            await updateNudgeSettings({ streakReminderTime: reminderTime, timezone, timezoneOffsetMinutes }).unwrap();
            toast.success('Streak reminder time updated');
        } catch {
            toast.error('Failed to update streak reminder time');
        }
    };

    return {
        nudgeSettings,
        isUpdatingNudgeSettings,
        preDeadlineSelectValue,
        streakReminderSelectValue,
        toggleBucket,
        toggleGroupedSummaries,
        togglePositiveTone,
        handlePreDeadlineChange,
        handleStreakReminderChange,
    };
}