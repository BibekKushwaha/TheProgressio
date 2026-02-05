import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export type Status = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Category {
    id: string;
    name: string;
    colorCode: string;
    userId: string;
}

export interface Task {
    id: string;
    title: string;
    status: Status;
    priority: Priority;
    dueDate: string | null;
    isRecurring: boolean;
    userId: string;
    categoryId: string | null;
    category?: Category | null;
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
        getTasks: builder.query<Task[], { page?: number; limit?: number; status?: Status; priority?: Priority; categoryId?: string; search?: string } | void>({
            query: (params) => ({
                url: '/',
                method: 'GET',
                params: params || {},
            }),
            providesTags: ['Tasks'],
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
            invalidatesTags: ['Tasks'],
        }),
        updateTask: builder.mutation<Task, UpdateTaskRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Tasks', { type: 'Tasks', id }],
        }),
        deleteTask: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Tasks'],
        }),
        toggleTask: builder.mutation<Task, string>({
            query: (id) => ({
                url: `/${id}/toggle`,
                method: 'PATCH',
            }),
            invalidatesTags: (_result, _error, id) => ['Tasks', { type: 'Tasks', id }],
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
} = tasksApi;
