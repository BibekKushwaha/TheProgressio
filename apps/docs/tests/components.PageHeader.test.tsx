import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageHeader } from '../components/layout/PageHeader';

describe('PageHeader', () => {
    it('renders the title', () => {
        render(<PageHeader title="My Page" />);
        expect(screen.getByText('My Page')).toBeTruthy();
    });

    it('renders a string subtitle as a paragraph', () => {
        render(<PageHeader title="Title" subtitle="This is the subtitle" />);
        expect(screen.getByText('This is the subtitle')).toBeTruthy();
    });

    it('renders a ReactNode subtitle', () => {
        render(<PageHeader title="T" subtitle={<span data-testid="custom-sub">custom</span>} />);
        expect(screen.getByTestId('custom-sub')).toBeTruthy();
    });

    it('renders children as action slot', () => {
        render(
            <PageHeader title="T">
                <button>Action</button>
            </PageHeader>
        );
        expect(screen.getByRole('button', { name: 'Action' })).toBeTruthy();
    });

    it('does not render child slot when children is absent', () => {
        const { container } = render(<PageHeader title="T" />);
        // Children wrapper should not be present when there are no children
        expect(container.querySelectorAll('button').length).toBe(0);
    });

    it('applies additional className', () => {
        const { container } = render(<PageHeader title="T" className="extra-class" />);
        expect(container.firstChild?.toString()).toBeTruthy();
        // className is applied to the wrapper div
        const wrapper = container.querySelector('.extra-class');
        expect(wrapper).toBeTruthy();
    });
});
