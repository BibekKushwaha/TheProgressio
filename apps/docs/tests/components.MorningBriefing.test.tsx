import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Provide mutable briefing data
let mockBriefing: Record<string, unknown> | null = {
    message: 'Good morning',
    topPriority: 'Study physics',
    streaksAtRisk: [],
    upcomingExams: [{ title: 'Physics Exam', daysUntil: 5 }],
};
let mockLoading = false;

vi.mock('@/hooks/usePageVisibility', () => ({
    usePageVisibility: () => true,
}));

vi.mock('@repo/store', () => ({
    useGetMorningBriefingQuery: () => ({
        data: mockBriefing ? { briefing: mockBriefing } : { briefing: null },
        isLoading: mockLoading,
    }),
    useGetTasksQuery: () => ({
        data: [],
    }),
    TaskStatus: { PENDING: 'PENDING' },
}));

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) =>
        <a href={href}>{children}</a>,
}));

import { MorningBriefing } from '../components/dashboard/MorningBriefing';

describe('MorningBriefing', () => {
    beforeEach(() => {
        mockBriefing = {
            message: 'Good morning',
            topPriority: 'Study physics',
            streaksAtRisk: [],
            upcomingExams: [{ title: 'Physics Exam', daysUntil: 5 }],
        };
        mockLoading = false;
    });

    it('renders the "Morning Briefing" heading when data is available', () => {
        render(<MorningBriefing />);
        expect(screen.getByText('Morning Briefing')).toBeTruthy();
    });

    it('renders the attendance reminder row', () => {
        render(<MorningBriefing />);
        expect(screen.getByText(/mark attendance/i)).toBeTruthy();
    });

    it('renders loading skeleton when isLoading is true', () => {
        mockLoading = true;
        mockBriefing = null;
        const { container } = render(<MorningBriefing />);
        // The loading skeleton uses animate-pulse class
        expect(container.querySelector('.animate-pulse')).toBeTruthy();
    });

    it('renders nothing when briefing is null and not loading', () => {
        mockBriefing = null;
        const { container } = render(<MorningBriefing />);
        expect(container.firstChild).toBeNull();
    });

    it('renders upcoming exam information', () => {
        render(<MorningBriefing />);
        expect(screen.getByText(/Physics Exam/i)).toBeTruthy();
    });
});
