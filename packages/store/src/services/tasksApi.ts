import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { calendarApi } from './calendarApi';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

export interface NotificationAction {
    id: string;
    label: string;
    actionType: string;
}

export interface ComposeNotificationRequest {
    category: 'URGENCY_DRIVEN' | 'MORNING_BRIEFING' | 'BEHAVIORAL_NUDGE' | 'ADVANCE_ALERT_3WEEK' | 'TRANSACTION_SYSTEM';
    title: string;
    body: string;
    emoji?: string;
    imageUrl?: string;
    richMedia?: { type: 'IMAGE' | 'GIF' | 'VIDEO'; url: string; sizeMb: number; platform: 'ANDROID' | 'IOS' | 'WEB' };
    progress?: { current: number; total: number; label?: string };
    actions?: NotificationAction[];
    deepLink: string;
    directReplyEnabled?: boolean;
    whatsappFallback?: boolean;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    taskId?: string;
    examId?: string;
}

export interface PlannerNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    metadata?: Record<string, unknown> | string;
}

export enum PriorityEnum {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export type Status = TaskStatus;
export type Priority = PriorityEnum;

export interface Category {
    id: string;
    name: string;
    colorCode: string;
    icon?: string | null;
    userId: string;
}

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
    taskId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    size?: string | null;
    taskId: string;
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string | null;
    status: Status;
    priority: Priority;
    dueDate: string | null;
    isRecurring: boolean;
    userId: string;
    categoryId: string | null;
    category?: Category | null;
    subtasks?: SubTask[];
    attachments?: Attachment[];
}

export interface CreateTaskRequest {
    title: string;
    description?: string;
    status?: Status;
    priority?: Priority;
    categoryId?: string;
    dueDate?: string;
    isRecurring?: boolean;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
    id: string;
}

export interface SyllabusScanItem {
    title: string;
    dueDate?: string;
    priority?: Priority;
    subject?: string;
}

export interface RecoveryPlanItem {
    taskId: string;
    title: string;
    priority: Priority;
    oldDueDate: string;
    newDueDate: string;
    daysShifted: number;
    loadPoints: number;
}

export interface RecoveryPlan {
    createdAt: string;
    backlogCount: number;
    totalPriorityLoad: number;
    recoveryDays: number;
    maxDailyLoad: number;
    items: RecoveryPlanItem[];
}

const plannerBaseQuery = fetchBaseQuery({
    baseUrl: `${PLANNER_SERVICE_URL}/api`,
    credentials: 'include',
    prepareHeaders: (headers) => {
        headers.set('Content-Type', 'application/json');
        return headers;
    },
});

export const tasksApi = createApi({
    reducerPath: 'tasksApi',
    baseQuery: plannerBaseQuery,
    tagTypes: ['Tasks'],
    endpoints: (builder) => ({
        getTasks: builder.query<Task[], { page?: number; limit?: number; status?: Status; priority?: Priority; categoryId?: string; search?: string; date?: string } | void>({
            query: (params) => ({
                url: '/tasks',
                method: 'GET',
                params: params || {},
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Tasks' as const, id })),
                        { type: 'Tasks', id: 'LIST' },
                    ]
                    : [{ type: 'Tasks', id: 'LIST' }],
        }),
        getTaskById: builder.query<Task, string>({
            query: (id) => `/tasks/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Tasks' as const, id }],
        }),
        createTask: builder.mutation<Task, CreateTaskRequest>({
            query: (body) => ({
                url: '/tasks',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Tasks', id: 'LIST' }],
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: newTask } = await queryFulfilled;
                    dispatch(
                        tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
                            if (Array.isArray(draft)) {
                                draft.unshift(newTask);
                            }
                        })
                    );
                    // Invalidate all calendar queries to show new task
                    dispatch(calendarApi.util.invalidateTags([{ type: 'Calendar', id: 'LIST' }]));
                } catch { }
            },
        }),
        updateTask: builder.mutation<Task, UpdateTaskRequest>({
            query: ({ id, ...body }) => ({
                url: `/tasks/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Tasks', id }],
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
                        const task = draft.find((t) => t.id === id);
                        if (task) {
                            Object.assign(task, patch);
                        }
                    })
                );
                dispatch(
                    tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
                        Object.assign(draft, patch);
                    })
                );
                try {
                    await queryFulfilled;
                    // Invalidate calendar when task is updated (e.g., status change, date change)
                    dispatch(calendarApi.util.invalidateTags([{ type: 'Calendar', id: 'LIST' }]));
                } catch {
                    patchResult.undo();
                }
            },
        }),
        deleteTask: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/tasks/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Tasks', id }, { type: 'Tasks', id: 'LIST' }],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
                        return draft.filter((t) => t.id !== id);
                    })
                );
                try {
                    await queryFulfilled;
                    // Invalidate calendar when task is deleted
                    dispatch(calendarApi.util.invalidateTags([{ type: 'Calendar', id: 'LIST' }]));
                } catch {
                    patchResult.undo();
                }
            },
        }),
        toggleTask: builder.mutation<Task, string>({
            query: (id) => ({
                url: `/tasks/${id}/toggle`,
                method: 'PATCH',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Tasks', id }],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                try {
                    const { data: updatedTask } = await queryFulfilled;
                    dispatch(
                        tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
                            const index = draft.findIndex((t) => t.id === id);
                            if (index !== -1) {
                                draft[index] = updatedTask;
                            }
                        })
                    );
                    dispatch(
                        tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
                            Object.assign(draft, updatedTask);
                        })
                    );
                    // Invalidate calendar when task status is toggled
                    dispatch(calendarApi.util.invalidateTags([{ type: 'Calendar', id: 'LIST' }]));
                } catch { }
            },
        }),
        createSubTask: builder.mutation<SubTask, { taskId: string; title: string }>({
            query: (body) => ({
                url: '/subtasks',
                method: 'POST',
                body,
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
        }),
        updateSubTask: builder.mutation<SubTask, { id: string; title?: string; completed?: boolean; taskId: string }>({
            query: ({ id, taskId, ...body }) => ({
                url: `/subtasks/${id}`,
                method: 'PATCH',
                body,
            }),
            // invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
            async onQueryStarted({ id, taskId, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTaskById', taskId, (draft) => {
                        const subtask = draft.subtasks?.find((s) => s.id === id);
                        if (subtask) {
                            Object.assign(subtask, patch);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            }
        }),
        deleteSubTask: builder.mutation<{ message: string }, { id: string; taskId: string }>({
            query: ({ id }) => ({
                url: `/subtasks/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
            async onQueryStarted({ id, taskId }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTaskById', taskId, (draft) => {
                        if (draft.subtasks) {
                            draft.subtasks = draft.subtasks.filter(s => s.id !== id);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            }
        }),
        createAttachment: builder.mutation<Attachment, { taskId: string; name: string; url: string; size?: string }>({
            query: (body) => ({
                url: '/attachments',
                method: 'POST',
                body,
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
        }),
        deleteAttachment: builder.mutation<{ message: string }, { id: string; taskId: string }>({
            query: ({ id }) => ({
                url: `/attachments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
        }),
        smartCreateTask: builder.mutation<{ message: string; task: Task; parsedMeta: any }, { text: string }>({
            query: (body) => ({
                url: '/tasks/smart-create',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Tasks', id: 'LIST' }],
        }),
        generateSubtasks: builder.mutation<Task, string>({
            query: (id) => ({
                url: `/tasks/${id}/subtasks`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Tasks', id }],
        }),
        previewSubtasks: builder.mutation<{ subtasks: string[] }, { title: string; description?: string }>({
            query: (body) => ({
                url: '/tasks/preview-subtasks',
                method: 'POST',
                body,
            }),
            invalidatesTags: [],
        }),
        parseTask: builder.mutation<{
            title: string;
            description?: string;
            dueDate?: string;
            priority?: Priority;
            subject?: string;
            effort?: string;
            type?: string;
        }, { text: string }>({
            query: (body) => ({
                url: '/tasks/parse',
                method: 'POST',
                body,
            }),
            invalidatesTags: [],
        }),
        scanSyllabus: builder.mutation<{ items: SyllabusScanItem[] }, { imageBase64: string; mimeType?: string }>({
            query: (body) => ({
                url: '/tasks/scan-syllabus',
                method: 'POST',
                body,
            }),
            invalidatesTags: [],
        }),
        previewRecoveryPlan: builder.mutation<{ message: string; plan: RecoveryPlan }, { anchorDate?: string } | void>({
            query: (body) => ({
                url: '/tasks/recovery/preview',
                method: 'POST',
                body: body || {},
            }),
            invalidatesTags: [],
        }),
        applyRecoveryPlan: builder.mutation<{ message: string; plan: RecoveryPlan; updatedCount: number }, { anchorDate?: string; taskIds?: string[]; overrides?: Record<string, string> } | void>({
            query: (body) => ({
                url: '/tasks/recovery/apply',
                method: 'POST',
                body: body || {},
            }),
            invalidatesTags: [{ type: 'Tasks', id: 'LIST' }],
        }),

        composeNotification: builder.mutation<{ message: string; notification: PlannerNotification }, ComposeNotificationRequest>({
            query: (body) => ({
                url: '/notifications/compose',
                method: 'POST',
                body,
            }),
        }),
        postNotificationDirectReply: builder.mutation<{ message: string }, { taskId?: string; nudgeId?: string; text: string }>({
            query: (body) => ({
                url: '/notifications/direct-reply',
                method: 'POST',
                body,
            }),
        }),
        createRevisionDripCampaign: builder.mutation<
            { message: string; campaign: PlannerNotification[] },
            { examTitle: string; examDate: string; chapter?: string; deepLinkBase?: string }
        >({
            query: (body) => ({
                url: '/notifications/drip-campaign/revision',
                method: 'POST',
                body,
            }),
        }),
        triggerGeofencePing: builder.mutation<
            { message: string; nudge: PlannerNotification },
            { placeType: 'LIBRARY' | 'CAMPUS' | 'HOME' | 'COACHING_CENTER'; plannedTaskId?: string; brightness?: number; motionState?: 'STATIONARY' | 'WALKING' | 'IN_TRANSIT' }
        >({
            query: (body) => ({
                url: '/notifications/geofence/ping',
                method: 'POST',
                body,
            }),
        }),
        getNotificationDeepLink: builder.query<{ message: string; deepLink: string }, { entityType: string; entityId: string }>({
            query: ({ entityType, entityId }) => `/notifications/deeplink/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
        }),
    }),
});

export const {
    useGetTasksQuery,
    useGetTaskByIdQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
    useToggleTaskMutation,
    useCreateSubTaskMutation,
    useUpdateSubTaskMutation,
    useDeleteSubTaskMutation,
    useCreateAttachmentMutation,
    useDeleteAttachmentMutation,
    useSmartCreateTaskMutation,
    useGenerateSubtasksMutation,
    usePreviewSubtasksMutation,
    useParseTaskMutation,
    useScanSyllabusMutation,
    usePreviewRecoveryPlanMutation,
    useApplyRecoveryPlanMutation,
    useComposeNotificationMutation,
    usePostNotificationDirectReplyMutation,
    useCreateRevisionDripCampaignMutation,
    useTriggerGeofencePingMutation,
    useGetNotificationDeepLinkQuery,
} = tasksApi;
