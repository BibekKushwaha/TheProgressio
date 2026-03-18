import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockPathname = '/dashboard';
const mockPush = vi.fn();
const mockDispatch = vi.fn();
const mockLogout = vi.fn();
const mockIsAdmin = false;

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
    default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
        <a href={href} onClick={onClick}>
            {children}
        </a>
    ),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/navigationTelemetry', () => ({
    trackFeatureOpened: vi.fn(),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
    ),
}));

vi.mock('@repo/store', () => ({
    logout: () => ({ type: 'auth/logout' }),
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: (state: { auth: { user: null }; }) => unknown) => selector({ auth: { user: null } }),
    useLogoutMutation: () => [mockLogout, { isLoading: false }],
    selectIsAdmin: () => mockIsAdmin,
}));

import Sidebar from '../components/layout/Sidebar';

describe('Sidebar', () => {
    beforeEach(() => {
        mockPathname = '/dashboard';
        mockPush.mockReset();
        mockDispatch.mockReset();
        mockLogout.mockReset();
        mockLogout.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    });

    it('shows Analytics section for all users on desktop', () => {
        render(<Sidebar />);

        expect(screen.getByText('Analytics & Review')).toBeTruthy();
        expect(screen.getByText('Analytics')).toBeTruthy();
        expect(screen.getByText('Achievements')).toBeTruthy();
    });

    it('shows Analytics in the mobile drawer', () => {
        render(<Sidebar />);

        fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

        expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Analytics & Review').length).toBeGreaterThan(0);
    });

    it('keeps analytics submenu behavior when on an analytics route', () => {
        mockPathname = '/analytics/strategic';
        render(<Sidebar />);

        expect(screen.getByText('Strategic')).toBeTruthy();
        expect(screen.getByText('Weekly Review')).toBeTruthy();
    });
});
