import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replaceMock = vi.fn();
const pathnameMock = '/dashboard';

const mockState = {
  auth: {
    isAuthenticated: false,
    status: 'idle',
  },
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock,
}));

vi.mock('@repo/store', () => ({
  selectIsAuthenticated: (state: typeof mockState) => state.auth.isAuthenticated,
  selectAuthStatus: (state: typeof mockState) => state.auth.status,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

import { AuthGuard } from '../components/layout/AuthGuard';

describe('AuthGuard', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    mockState.auth.isAuthenticated = false;
    mockState.auth.status = 'idle';
  });

  it('renders children when authenticated', () => {
    mockState.auth.isAuthenticated = true;
    mockState.auth.status = 'authenticated';

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  it('shows the verification loader while auth is hydrating', () => {
    mockState.auth.status = 'loading';

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Verifying session')).toBeTruthy();
  });

  it('redirects to login when the client auth state becomes unauthenticated', async () => {
    mockState.auth.status = 'unauthenticated';

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Redirecting to login')).toBeTruthy();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login?next=%2Fdashboard');
    });
  });
});