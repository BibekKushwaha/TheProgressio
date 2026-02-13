import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const PLANNER_SERVICE_URL =
  process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PlanId = 'PRO' | 'INSTITUTION';
export type PaymentMethod = 'upi' | 'netbanking' | 'card';

export interface CreateOrderRequest {
  plan: PlanId;
  method?: PaymentMethod;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  plan: PlanId;
  description: string;
  mock: boolean;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  plan: PlanId;
}

export interface VerifyPaymentResponse {
  success: boolean;
  subscription: {
    id: string;
    plan: string;
    status: string;
    currentPeriodEnd: string;
  };
}

export interface SubscriptionStatus {
  active: boolean;
  plan: string | null;
  status: string;
  currentPeriodEnd: string | null;
  subscription: {
    id: string;
    plan: string;
    status: string;
    amountPaise: number;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelledAt: string | null;
  } | null;
}

export interface PaymentRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountPaise: number;
  currency: string;
  status: string;
  method: string | null;
  createdAt: string;
}

// ─── API Slice ──────────────────────────────────────────────────────────────────

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${PLANNER_SERVICE_URL}/api/payments`,
    credentials: 'include',
  }),
  tagTypes: ['Subscription', 'PaymentHistory'],
  endpoints: (builder) => ({
    createOrder: builder.mutation<CreateOrderResponse, CreateOrderRequest>({
      query: (body) => ({
        url: '/create-order',
        method: 'POST',
        body,
      }),
    }),

    verifyPayment: builder.mutation<VerifyPaymentResponse, VerifyPaymentRequest>({
      query: (body) => ({
        url: '/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription', 'PaymentHistory'],
    }),

    getSubscriptionStatus: builder.query<SubscriptionStatus, void>({
      query: () => '/status',
      providesTags: ['Subscription'],
    }),

    cancelSubscription: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/cancel',
        method: 'POST',
      }),
      invalidatesTags: ['Subscription'],
    }),

    getPaymentHistory: builder.query<PaymentRecord[], void>({
      query: () => '/history',
      providesTags: ['PaymentHistory'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useGetSubscriptionStatusQuery,
  useCancelSubscriptionMutation,
  useGetPaymentHistoryQuery,
} = paymentApi;
