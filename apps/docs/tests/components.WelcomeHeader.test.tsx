import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@repo/store', () => ({
    useAppSelector: (selector: (s: { auth: { user: { username: string } | null } }) => unknown) =>
        selector({ auth: { user: { username: 'Alice' } } }),
    useGetNudgesQuery: () => ({ data: { nudges: [] } }),
    useGetUserXPQuery: () => ({
        data: {
            xp: { level: 3, levelName: 'Scholar', progress: 65, xp: 320 },
        },
    }),
    Nudge: {},
}));

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) =>
        <a href={href}>{children}</a>,
}));

// Stub out heavy sub-components
vi.mock('@/components/habit/NotificationCenter', () => ({
    NotificationCenter: () => <div>__NotificationCenter__</div>,
}));
vi.mock('@/components/planner/TimetableView', () => ({
    TimetableView: () => <div>__TimetableView__</div>,
}));

import { WelcomeHeader } from '../components/dashboard/WelcomeHeader';

describe('WelcomeHeader', () => {
    it('renders a greeting with the username', () => {
        render(<WelcomeHeader />);
        // The greeting uses the username from the auth selector
        expect(screen.getByText(/Welcome back, Alice/i)).toBeTruthy();
    });

    it('renders the current date as a subtitle', () => {
        render(<WelcomeHeader />);
        // Date will vary; just check the subtitle includes a year
        const subtitles = screen.getAllByText(/202\d/);
        expect(subtitles.length).toBeGreaterThan(0);
    });

    it('renders the XP level badge when XP data is available', () => {
        render(<WelcomeHeader />);
        expect(screen.getByText('Scholar')).toBeTruthy();
        expect(screen.getByText('320')).toBeTruthy();
    });

    it('renders the notifications button', () => {
        render(<WelcomeHeader />);
        expect(screen.getByRole('button', { name: /notification/i })).toBeTruthy();
    });

    it('shows unread badge as 0 when all nudges are read', () => {
        render(<WelcomeHeader />);
        // No unread badge should be rendered since nudges array is empty
        // The badge displays when displayedCount > 0; with empty list it should be absent
        expect(screen.queryByText('1')).toBeNull();
    });
});
