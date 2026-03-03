'use client';

import { useCallback } from 'react';
import {
    useMarkNudgeAsReadMutation,
    useMarkAllNudgesAsReadMutation,
    usePostNotificationDirectReplyMutation,
    useUpdateTaskMutation,
    useGenerateSubtasksMutation,
    TaskStatus,
    useAppDispatch,
    habitsApi,
} from '@repo/store';
import type { Nudge } from '@repo/store';
import { toast } from 'sonner';
import { parseNudgeMetadata, UUID_REGEX } from './notificationUtils';

export function useNudgeActions() {
    const dispatch = useAppDispatch();

    const [markRead] = useMarkNudgeAsReadMutation();
    const [markAllRead, { isLoading: isMarkingAllRead }] = useMarkAllNudgesAsReadMutation();
    const [postDirectReply, { isLoading: isReplying }] = usePostNotificationDirectReplyMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [generateSubtasks] = useGenerateSubtasksMutation();

    const handleMarkRead = useCallback(
        async (id: string) => {
            try {
                await markRead(id).unwrap();
            } catch (error) {
                console.error('Failed to mark nudge as read:', error);
            }
        },
        [markRead]
    );

    const handleMarkAllRead = useCallback(async () => {
        try {
            await markAllRead().unwrap();

            // Optimistic cache update — avoids a second network request
            dispatch(
                habitsApi.util.updateQueryData('getNudges', undefined, (draft) => {
                    if (draft && Array.isArray(draft.nudges)) {
                        draft.nudges = draft.nudges.map((n: Nudge) => ({ ...n, isRead: true }));
                    }
                })
            );

            toast.success('All notifications marked read');
        } catch (error) {
            console.error('Failed to mark all nudges as read:', error);
            toast.error('Failed to mark all as read');
        }
    }, [dispatch, markAllRead]);

    const handleDirectReply = useCallback(
        async (nudge: Nudge, text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const metadata = parseNudgeMetadata(nudge.metadata);
            const taskId = typeof metadata.taskId === 'string' ? metadata.taskId : undefined;
            const metaNudgeId =
                typeof metadata.nudgeId === 'string' ? metadata.nudgeId : undefined;

            const hasValidMetaNudgeId =
                typeof metaNudgeId === 'string' && UUID_REGEX.test(metaNudgeId);
            const hasValidNudgeId =
                typeof nudge.id === 'string' && UUID_REGEX.test(nudge.id);

            if (!taskId && !hasValidMetaNudgeId && !hasValidNudgeId) {
                toast.error('Cannot send reply: unsupported notification id');
                return;
            }

            const payload: { taskId?: string; nudgeId?: string; text: string } = { text: trimmed };
            if (taskId) payload.taskId = taskId;
            else if (hasValidMetaNudgeId) payload.nudgeId = metaNudgeId;
            else payload.nudgeId = String(nudge.id);

            try {
                await postDirectReply(payload).unwrap();
            } catch (error) {
                let userMessage = 'Failed to send reply';
                if (error && typeof error === 'object') {
                    const err = error as { data?: { message?: string }; error?: string; message?: string };
                    userMessage = err.data?.message ?? err.error ?? err.message ?? userMessage;
                }
                toast.error(userMessage);
                throw error; // re-throw so NudgeDirectReply can reset its input
            }
        },
        [postDirectReply]
    );

    const runAction = useCallback(
        async (nudge: Nudge, actionType: string) => {
            const metadata = parseNudgeMetadata(nudge.metadata);
            const taskId = typeof metadata.taskId === 'string' ? metadata.taskId : undefined;

            try {
                if (actionType === 'MARK_COMPLETED' && taskId) {
                    await updateTask({ id: taskId, status: TaskStatus.COMPLETED }).unwrap();
                    await markRead(nudge.id).unwrap();
                    return;
                }
                if (actionType === 'SNOOZE_1_HOUR' && taskId) {
                    const dueDate = new Date();
                    dueDate.setHours(dueDate.getHours() + 1);
                    await updateTask({ id: taskId, dueDate: dueDate.toISOString() }).unwrap();
                    return;
                }
                if (actionType === 'BREAK_IT_DOWN' && taskId) {
                    await generateSubtasks(taskId).unwrap();
                    return;
                }
            } catch (error) {
                console.error('Action failed:', error);
                toast.error('Action failed');
            }
        },
        [generateSubtasks, markRead, updateTask]
    );

    const snoozeTask = useCallback(
        async (taskId: string | undefined, minutes: number, label: string) => {
            if (!taskId) {
                toast.error('No task linked to this notification');
                return;
            }
            try {
                const dueDate = new Date();
                dueDate.setMinutes(dueDate.getMinutes() + minutes);
                await updateTask({ id: taskId, dueDate: dueDate.toISOString() }).unwrap();
                toast.success(`Snoozed for ${label}`);
            } catch {
                toast.error('Failed to snooze');
            }
        },
        [updateTask]
    );

    return {
        handleMarkRead,
        handleMarkAllRead,
        handleDirectReply,
        runAction,
        snoozeTask,
        isMarkingAllRead,
        isReplying,
    };
}
