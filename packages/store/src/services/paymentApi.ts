import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withAuthRefresh, withRetry } from '../baseQuery';
import { isNativeRuntime, resolveServiceUrl } from '../runtime';
import { getAccessTokenSync } from '../mobile-token-store';

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
  /** Razorpay order ID — pass to Razorpay Checkout as `order_id` */
  orderId: string;
  /** Razorpay public key — pass to Razorpay Checkout as `key` */
  keyId: string;
  plan: BillingPlan;
  provider: PaymentProvider;
  amountPaise: number;
  currency: string;
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

/** Fields returned by Razorpay Checkout handler callback */
export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  idempotent: boolean;
  orderId: string;
  plan: BillingPlan | null;
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

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: withAuthRefresh(withRetry(fetchBaseQuery({
    baseUrl: `${PLANNER_SERVICE_URL}/api`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      const accessToken = isNativeRuntime() ? getAccessTokenSync() : null;
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
  }))),
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
        body: {
          razorpayOrderId:   body.razorpayOrderId,
          razorpayPaymentId: body.razorpayPaymentId,
          razorpaySignature: body.razorpaySignature,
        },
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
      transformResponse: (response: { payments?: PaymentRecord[] } | PaymentRecord[]) =>
        Array.isArray(response) ? response : response.payments ?? [],
      providesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetBillingProfileQuery,
  useCreatePaymentIntentMutation,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useGetSubscriptionStatusQuery,
  useCancelSubscriptionMutation,
  useGetPaymentHistoryQuery,
} = paymentApi;
