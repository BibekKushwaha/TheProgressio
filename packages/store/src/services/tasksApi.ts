import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
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

export const tasksApi = createApi({
    reducerPath: 'tasksApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/tasks`,
        credentials: 'include', // Include cookies for isAuth middleware
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Tasks'],
    endpoints: (builder) => ({
        getTasks: builder.query<Task[], { page?: number; limit?: number; status?: Status; priority?: Priority; categoryId?: string; search?: string; date?: string } | void>({
            query: (params) => ({
                url: '/',
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
            query: (id) => `/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Tasks' as const, id }],
        }),
        createTask: builder.mutation<Task, CreateTaskRequest>({
            query: (body) => ({
                url: '/',
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
                } catch { }
            },
        }),
        updateTask: builder.mutation<Task, UpdateTaskRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
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
                } catch {
                    patchResult.undo();
                }
            },
        }),
        deleteTask: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/${id}`,
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
                } catch {
                    patchResult.undo();
                }
            },
        }),
        toggleTask: builder.mutation<Task, string>({
            query: (id) => ({
                url: `/${id}/toggle`,
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
                } catch { }
            },
        }),
        createSubTask: builder.mutation<SubTask, { taskId: string; title: string }>({
            query: (body) => ({
                url: '/../subtasks',
                method: 'POST',
                body,
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
        }),
        updateSubTask: builder.mutation<SubTask, { id: string; title?: string; completed?: boolean; taskId: string }>({
            query: ({ id, taskId, ...body }) => ({
                url: `/../subtasks/${id}`,
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
                url: `/../subtasks/${id}`,
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
                url: '/../attachments',
                method: 'POST',
                body,
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
        }),
        deleteAttachment: builder.mutation<{ message: string }, { id: string; taskId: string }>({
            query: ({ id }) => ({
                url: `/../attachments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Tasks', id: taskId }],
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
} = tasksApi;
