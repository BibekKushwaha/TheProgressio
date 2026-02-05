import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Task } from './tasksApi';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export interface Category {
    id: string;
    name: string;
    colorCode: string;
    userId: string;
    _count?: {
        tasks: number;
    };
    tasks?: Task[];
}

export interface CreateCategoryRequest {
    name: string;
    colorCode?: string;
}

export interface UpdateCategoryRequest {
    id: string;
    name?: string;
    colorCode?: string;
}

export const categoriesApi = createApi({
    reducerPath: 'categoriesApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/categories`,
        credentials: 'include', // Include cookies for isAuth middleware
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Categories'],
    endpoints: (builder) => ({
        getCategories: builder.query<Category[], void>({
            query: () => ({
                url: '/',
                method: 'GET',
            }),
            providesTags: ['Categories'],
        }),
        getCategoryById: builder.query<Category, string>({
            query: (id) => `/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Categories' as const, id }],
        }),
        createCategory: builder.mutation<Category, CreateCategoryRequest>({
            query: (body) => ({
                url: '/',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Categories'],
        }),
        updateCategory: builder.mutation<Category, UpdateCategoryRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Categories', { type: 'Categories', id }],
        }),
        deleteCategory: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Categories'],
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryByIdQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
} = categoriesApi;
