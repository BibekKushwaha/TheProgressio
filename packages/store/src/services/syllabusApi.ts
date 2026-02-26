import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withAuthRefresh, withRetry } from '../baseQuery';
import { getFamilyShareToken, isNativeRuntime, resolveServiceUrl } from '../runtime';
import { getAccessTokenSync } from '../mobile-token-store';

const PLANNER_SERVICE_URL = resolveServiceUrl(
  process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL,
  'http://localhost:4001',
);

export type SyllabusTopic = {
  id: string;
  userId: string;
  categoryId: string;
  chapter: string;
  title: string;
  notes?: string | null;
  weight?: number | null;
  estimatedHours?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SyllabusEdge = {
  id: string;
  userId: string;
  fromTopicId: string;
  toTopicId: string;
  createdAt: string;
  fromTopic?: { id: string; chapter: string; title: string; categoryId: string };
  toTopic?: { id: string; chapter: string; title: string; categoryId: string };
};

export type TaskSyllabusLink = {
  id: string;
  userId: string;
  taskId: string;
  topicId: string;
  createdAt: string;
  topic: { id: string; chapter: string; title: string; categoryId: string };
};

const baseQuery = fetchBaseQuery({
  baseUrl: `${PLANNER_SERVICE_URL}/api`,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json');
    const accessToken = isNativeRuntime() ? getAccessTokenSync() : null;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    const shareToken = getFamilyShareToken();
    if (shareToken) {
      headers.set('x-family-share-token', shareToken);
    }
    return headers;
  },
});

export const syllabusApi = createApi({
  reducerPath: 'syllabusApi',
  baseQuery: withAuthRefresh(withRetry(baseQuery)),
  tagTypes: ['Syllabus'],
  endpoints: (builder) => ({
    getSyllabusTopics: builder.query<{ message: string; topics: SyllabusTopic[] }, { categoryId?: string } | void>({
      query: (args) => ({
        url: '/syllabus/topics',
        method: 'GET',
        params: args ?? {},
      }),
      providesTags: ['Syllabus'],
    }),
    createSyllabusTopic: builder.mutation<
      { message: string; topic: SyllabusTopic },
      { categoryId: string; chapter?: string; title: string; notes?: string | null; weight?: number | null; estimatedHours?: number | null }
    >({
      query: (body) => ({ url: '/syllabus/topics', method: 'POST', body }),
      invalidatesTags: ['Syllabus'],
    }),
    updateSyllabusTopic: builder.mutation<
      { message: string; topic: SyllabusTopic | null },
      { id: string } & Partial<{ chapter: string; title: string; notes: string | null; weight: number | null; estimatedHours: number | null }>
    >({
      query: ({ id, ...body }) => ({ url: `/syllabus/topics/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Syllabus'],
    }),
    deleteSyllabusTopic: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/syllabus/topics/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Syllabus'],
    }),
    getSyllabusEdges: builder.query<{ message: string; edges: SyllabusEdge[] }, { categoryId?: string } | void>({
      query: (args) => ({
        url: '/syllabus/edges',
        method: 'GET',
        params: args ?? {},
      }),
      providesTags: ['Syllabus'],
    }),
    createSyllabusEdge: builder.mutation<{ message: string; edge: SyllabusEdge }, { fromTopicId: string; toTopicId: string }>({
      query: (body) => ({ url: '/syllabus/edges', method: 'POST', body }),
      invalidatesTags: ['Syllabus'],
    }),
    deleteSyllabusEdge: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/syllabus/edges/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Syllabus'],
    }),
    getTaskSyllabusTopics: builder.query<{ message: string; links: TaskSyllabusLink[] }, string>({
      query: (taskId) => ({ url: `/syllabus/tasks/${taskId}/topics`, method: 'GET' }),
      providesTags: ['Syllabus'],
    }),
    setTaskSyllabusTopics: builder.mutation<{ message: string; links: TaskSyllabusLink[] }, { taskId: string; topicIds: string[] }>({
      query: ({ taskId, ...body }) => ({ url: `/syllabus/tasks/${taskId}/topics`, method: 'PUT', body }),
      invalidatesTags: ['Syllabus'],
    }),
  }),
});

export const {
  useGetSyllabusTopicsQuery,
  useCreateSyllabusTopicMutation,
  useUpdateSyllabusTopicMutation,
  useDeleteSyllabusTopicMutation,
  useGetSyllabusEdgesQuery,
  useCreateSyllabusEdgeMutation,
  useDeleteSyllabusEdgeMutation,
  useGetTaskSyllabusTopicsQuery,
  useSetTaskSyllabusTopicsMutation,
} = syllabusApi;

