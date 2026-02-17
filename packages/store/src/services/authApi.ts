import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4000';

export interface User {
  id: string;
  username: string;
  email: string;
  dailyGoalHours?: number;
  whatsappOptIn?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  createdAt: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  user: User;
  token?: string;
}

export interface MobileAuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface FamilyShareLink {
  id: string;
  label?: string | null;
  permissions: string;
  expiresAt?: string | null;
  createdAt: string;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${AUTH_SERVICE_URL}/api/auth`,
    credentials: 'include', // Include cookies in requests
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/register',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            authApi.util.updateQueryData('getProfile', undefined, () => data)
          );
        } catch {
          /* ignore */
        }
      },
    }),
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            authApi.util.updateQueryData('getProfile', undefined, () => data)
          );
        } catch {
          /* ignore */
        }
      },
    }),
    getProfile: builder.query<AuthResponse, void>({
      query: () => ({
        url: '/me',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.resetApiState());
        } catch {
          /* ignore */
        }
      },
    }),
    updateProfile: builder.mutation<AuthResponse, Partial<User>>({
      query: (body) => ({
        url: '/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            authApi.util.updateQueryData('getProfile', undefined, (draft) => {
              draft.user = data.user;
            })
          );
        } catch {
          /* ignore */
        }
      },
    }),
    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({
        url: '/forgot',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/reset/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
    mobileLogin: builder.mutation<MobileAuthResponse, { email: string; password: string; deviceId?: string }>({
      query: (body) => ({
        url: '/mobile/login',
        method: 'POST',
        body,
      }),
    }),
    mobileRefresh: builder.mutation<MobileAuthResponse, { refreshToken: string; deviceId?: string }>({
      query: (body) => ({
        url: '/mobile/refresh',
        method: 'POST',
        body,
      }),
    }),
    mobileLogout: builder.mutation<{ message: string }, { refreshToken?: string }>({
      query: (body) => ({
        url: '/mobile/logout',
        method: 'POST',
        body,
      }),
    }),
    mobileMe: builder.query<{ message: string; user: User }, string>({
      query: (accessToken) => ({
        url: '/mobile/me',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    }),
    createFamilyLink: builder.mutation<
      { message: string; link: FamilyShareLink; shareToken: string },
      { label?: string; permissions?: string; expiresInDays?: number }
    >({
      query: (body) => ({
        url: '/family-links',
        method: 'POST',
        body,
      }),
    }),
    getFamilyLinks: builder.query<{ message: string; links: FamilyShareLink[] }, void>({
      query: () => ({
        url: '/family-links',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
    revokeFamilyLink: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/family-links/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    resolveFamilyLink: builder.query<{
      message: string;
      link: { id: string; userId: string; label?: string; permissions: string; expiresAt?: string | null };
    }, string>({
      query: (token) => ({
        url: `/family-links/resolve/${token}`,
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetProfileQuery,
  useLogoutMutation,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useMobileLoginMutation,
  useMobileRefreshMutation,
  useMobileLogoutMutation,
  useMobileMeQuery,
  useCreateFamilyLinkMutation,
  useGetFamilyLinksQuery,
  useRevokeFamilyLinkMutation,
  useResolveFamilyLinkQuery,
} = authApi;
