import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

export type BillingPlan = 'FREE' | 'PRO' | 'INSTITUTION';
export type BillingStatus = 'INACTIVE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
export type PaymentProvider = 'UPI' | 'PAYTM' | 'NET_BANKING' | 'CARD';

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

export interface UpiCollectResponse {
  intentId: string;
  paymentRef: string;
  status: string;
  upiId: string;
  deepLink: string;
}

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${PLANNER_SERVICE_URL}/api`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Payments'],
  endpoints: (builder) => ({
    getBillingProfile: builder.query<{ message: string; profile: BillingProfile }, void>({
      query: () => '/payments/me',
      providesTags: ['Payments'],
    }),
    createPaymentIntent: builder.mutation<
      { message: string; intent: PaymentIntent },
      { plan: BillingPlan; provider: PaymentProvider; amountPaise?: number }
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
  }),
});

export const {
  useGetBillingProfileQuery,
  useCreatePaymentIntentMutation,
  useCreateUpiCollectMutation,
} = paymentApi;
