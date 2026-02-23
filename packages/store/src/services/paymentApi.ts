import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withRetry } from '../baseQuery';
import { resolveServiceUrl } from '../runtime';

const PLANNER_SERVICE_URL = resolveServiceUrl(
  process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL,
  'http://localhost:4001'
);

export type BillingPlan = 'FREE' | 'PRO' | 'INSTITUTION';
export type BillingStatus = 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
export type PaymentProvider = 'UPI' | 'PAYTM' | 'NET_BANKING' | 'CARD';
export type PlanId = BillingPlan;
export type PaymentMethod = PaymentProvider;

export interface BillingProfile {
  id: string;
  plan: BillingPlan;
  planStatus: BillingStatus;
  renewalAt?: string | null;
  paymentProvider?: string | null;
  paymentRef?: string | null;
}

export interface PaymentIntent {
  intentId: string;
  paymentRef: string;
  plan: BillingPlan;
  provider: PaymentProvider;
  amountPaise: number;
  status: string;
}

export interface CreateOrderRequest {
  plan: PlanId;
  paymentMethod: PaymentMethod;
}

export interface CreateOrderResponse {
  message: string;
  intent: PaymentIntent;
}

export interface VerifyPaymentRequest {
  intentId: string;
  paymentRef: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload?: string;
}

export interface VerifyPaymentResponse {
  message: string;
  intent: PaymentIntent;
}

export type SubscriptionStatus = BillingProfile;

export interface PaymentRecord {
  intentId: string;
  paymentRef: string;
  plan: BillingPlan;
  provider: PaymentProvider;
  amountPaise: number;
  status: string;
  createdAt?: string;
}

export interface UpiCollectResponse {
  intentId: string;
  paymentRef: string;
  status: string;
  upiId: string;
  deepLink: string;
}

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: withRetry(fetchBaseQuery({
    baseUrl: `${PLANNER_SERVICE_URL}/api`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  })),
  tagTypes: ['Payments'],
  endpoints: (builder) => ({
    getBillingProfile: builder.query<{ message: string; profile: BillingProfile }, void>({
      query: () => '/payments/me',
      providesTags: ['Payments'],
    }),
    createPaymentIntent: builder.mutation<
      { message: string; intent: PaymentIntent },
      { plan: BillingPlan; provider: PaymentProvider }
    >({
      query: (body) => ({
        url: '/payments/intents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
    createUpiCollect: builder.mutation<
      { message: string; collect: UpiCollectResponse },
      { intentId: string; upiId: string }
    >({
      query: (body) => ({
        url: '/payments/upi/collect',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
    createOrder: builder.mutation<CreateOrderResponse, CreateOrderRequest>({
      query: (body) => ({
        url: '/payments/intents',
        method: 'POST',
        body: {
          plan: body.plan,
          provider: body.paymentMethod,
        },
      }),
      invalidatesTags: ['Payments'],
    }),
    verifyPayment: builder.mutation<VerifyPaymentResponse, VerifyPaymentRequest>({
      query: (body) => ({
        url: '/payments/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
    getSubscriptionStatus: builder.query<SubscriptionStatus, void>({
      query: () => '/payments/me',
      transformResponse: (response: { profile: SubscriptionStatus } | SubscriptionStatus) =>
        'profile' in (response as any) ? (response as { profile: SubscriptionStatus }).profile : (response as SubscriptionStatus),
      providesTags: ['Payments'],
    }),
    cancelSubscription: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/payments/cancel',
        method: 'POST',
      }),
      invalidatesTags: ['Payments'],
    }),
    getPaymentHistory: builder.query<PaymentRecord[], void>({
      query: () => '/payments/history',
      transformResponse: (response: { items?: PaymentRecord[] } | PaymentRecord[]) =>
        Array.isArray(response) ? response : response.items ?? [],
      providesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetBillingProfileQuery,
  useCreatePaymentIntentMutation,
  useCreateUpiCollectMutation,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useGetSubscriptionStatusQuery,
  useCancelSubscriptionMutation,
  useGetPaymentHistoryQuery,
} = paymentApi;
