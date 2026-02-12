import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export interface RotationPattern {
    id: string;
    name: string;
    pattern: string[];
    startDate: string;
    cycleLengthDays: number;
    userId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRotationRequest {
    name: string;
    pattern: string[];
    startDate: string;
    cycleLengthDays?: number;
}

export interface UpdateRotationRequest {
    id: string;
    name?: string;
    pattern?: string[];
    startDate?: string;
    cycleLengthDays?: number;
    isActive?: boolean;
}

export interface ResolvedRotation {
    date: string;
    rotation: string;
    source: 'custom-pattern' | 'algorithmic-fallback';
    pattern: {
        id: string;
        name: string;
        labels: string[];
        cycleLengthDays: number;
    } | null;
}

export const rotationsApi = createApi({
    reducerPath: 'rotationsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${PLANNER_SERVICE_URL}/api/rotations`,
        credentials: 'include',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Rotations'],
    endpoints: (builder) => ({
        getRotationPatterns: builder.query<RotationPattern[], void>({
            query: () => '/',
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Rotations' as const, id })),
                        { type: 'Rotations', id: 'LIST' },
                    ]
                    : [{ type: 'Rotations', id: 'LIST' }],
        }),
        getRotationPatternById: builder.query<RotationPattern, string>({
            query: (id) => `/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Rotations' as const, id }],
        }),
        resolveRotation: builder.query<ResolvedRotation, { date?: string } | void>({
            query: (params) => ({
                url: '/resolve',
                method: 'GET',
                params: params || {},
            }),
            providesTags: [{ type: 'Rotations', id: 'RESOLVED' }],
        }),
        createRotationPattern: builder.mutation<RotationPattern, CreateRotationRequest>({
            query: (body) => ({
                url: '/',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Rotations', id: 'LIST' }, { type: 'Rotations', id: 'RESOLVED' }],
        }),
        updateRotationPattern: builder.mutation<RotationPattern, UpdateRotationRequest>({
            query: ({ id, ...body }) => ({
                url: `/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Rotations', id },
                { type: 'Rotations', id: 'LIST' },
                { type: 'Rotations', id: 'RESOLVED' },
            ],
        }),
        deleteRotationPattern: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Rotations', id },
                { type: 'Rotations', id: 'LIST' },
                { type: 'Rotations', id: 'RESOLVED' },
            ],
        }),
    }),
});

export const {
    useGetRotationPatternsQuery,
    useGetRotationPatternByIdQuery,
    useResolveRotationQuery,
    useCreateRotationPatternMutation,
    useUpdateRotationPatternMutation,
    useDeleteRotationPatternMutation,
} = rotationsApi;
