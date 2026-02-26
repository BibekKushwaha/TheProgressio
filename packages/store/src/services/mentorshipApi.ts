import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withAuthRefresh, withRetry } from '../baseQuery';
import { getFamilyShareToken, isNativeRuntime, resolveServiceUrl } from '../runtime';
import { getAccessTokenSync } from '../mobile-token-store';

const PLANNER_SERVICE_URL = resolveServiceUrl(
  process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL,
  'http://localhost:4001',
);

export type MentorAlertSubscription = {
  id: string;
  userId: string;
  label?: string | null;
  channel: string;
  recipientPhone: string;
  cadence: string;
  enabled: boolean;
  overdueThreshold: number;
  consistencyThreshold: number;
  cooldownMinutes: number;
  lastAlertAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MentorFeedback = {
  id: string;
  userId: string;
  shareLinkId?: string | null;
  fromLabel?: string | null;
  message: string;
  createdAt: string;
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

export const mentorshipApi = createApi({
  reducerPath: 'mentorshipApi',
  baseQuery: withAuthRefresh(withRetry(baseQuery)),
  tagTypes: ['Mentorship'],
  endpoints: (builder) => ({
    getMentorAlertSubscriptions: builder.query<{ message: string; subscriptions: MentorAlertSubscription[] }, void>({
      query: () => ({ url: '/mentorship/subscriptions', method: 'GET' }),
      providesTags: ['Mentorship'],
    }),
    createMentorAlertSubscription: builder.mutation<
      { message: string; subscription: MentorAlertSubscription },
      {
        label?: string;
        recipientPhone: string;
        cadence?: string;
        enabled?: boolean;
        overdueThreshold?: number;
        consistencyThreshold?: number;
        cooldownMinutes?: number;
      }
    >({
      query: (body) => ({ url: '/mentorship/subscriptions', method: 'POST', body }),
      invalidatesTags: ['Mentorship'],
    }),
    updateMentorAlertSubscription: builder.mutation<
      { message: string; subscription: MentorAlertSubscription | null },
      { id: string } & Partial<{
        label: string;
        recipientPhone: string;
        cadence: string;
        enabled: boolean;
        overdueThreshold: number;
        consistencyThreshold: number;
        cooldownMinutes: number;
      }>
    >({
      query: ({ id, ...body }) => ({ url: `/mentorship/subscriptions/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Mentorship'],
    }),
    revokeMentorAlertSubscription: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/mentorship/subscriptions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Mentorship'],
    }),
    getMentorFeedback: builder.query<{ message: string; feedback: MentorFeedback[] }, void>({
      query: () => ({ url: '/mentorship/feedback', method: 'GET' }),
      providesTags: ['Mentorship'],
    }),
    sendMentorFeedback: builder.mutation<
      { message: string; feedback: MentorFeedback },
      { message: string; fromLabel?: string }
    >({
      query: (body) => ({ url: '/mentorship/feedback', method: 'POST', body }),
      invalidatesTags: ['Mentorship'],
    }),
  }),
});

export const {
  useGetMentorAlertSubscriptionsQuery,
  useCreateMentorAlertSubscriptionMutation,
  useUpdateMentorAlertSubscriptionMutation,
  useRevokeMentorAlertSubscriptionMutation,
  useGetMentorFeedbackQuery,
  useSendMentorFeedbackMutation,
} = mentorshipApi;

