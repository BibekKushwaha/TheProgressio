import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Task } from './tasksApi';
import { resolveServiceUrl } from '../runtime';

const PLANNER_SERVICE_URL = resolveServiceUrl(
    process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL,
    'http://localhost:4001'
);

export interface Category {
    id: string;
    name: string;
    colorCode: string;
    icon?: string | null;
    userId: string;
    _count?: {
        tasks: number;
    };
    tasks?: Task[];
}

export interface CreateCategoryRequest {
    name: string;
    colorCode?: string;
    icon?: string;
}

export interface UpdateCategoryRequest {
    id: string;
    name?: string;
    colorCode?: string;
    icon?: string | null;
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
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Categories' as const, id })),
                        { type: 'Categories', id: 'LIST' },
                    ]
                    : [{ type: 'Categories', id: 'LIST' }],
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
            invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data: newCategory } = await queryFulfilled;
                    dispatch(
                        categoriesApi.util.updateQueryData('getCategories', undefined, (draft) => {
                            draft.push(newCategory);
                        })
                    );
                } catch {
                    /* ignore */
                }
            },
        }),
        updateCategory: builder.mutation<Category, UpdateCategoryRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Categories', id }],
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    categoriesApi.util.updateQueryData('getCategories', undefined, (draft) => {
                        const category = draft.find((c) => c.id === id);
                        if (category) {
                            Object.assign(category, patch);
                        }
                    })
                );
                dispatch(
                    categoriesApi.util.updateQueryData('getCategoryById', id, (draft) => {
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
        deleteCategory: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Categories', id }, { type: 'Categories', id: 'LIST' }],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    categoriesApi.util.updateQueryData('getCategories', undefined, (draft) => {
                        return draft.filter((c) => c.id !== id);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
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
