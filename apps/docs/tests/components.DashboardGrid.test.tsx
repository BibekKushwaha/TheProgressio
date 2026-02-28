import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardGrid } from '../components/layout/DashboardGrid';

describe('DashboardGrid', () => {
    it('renders children in the main content area', () => {
        render(
            <DashboardGrid sidebar={<div>sidebar</div>}>
                <div>main content</div>
            </DashboardGrid>
        );
        expect(screen.getByText('main content')).toBeTruthy();
    });

    it('renders sidebar content', () => {
        render(
            <DashboardGrid sidebar={<div>my sidebar</div>}>
                <div>main</div>
            </DashboardGrid>
        );
        expect(screen.getByText('my sidebar')).toBeTruthy();
    });

    it('renders both children and sidebar simultaneously', () => {
        render(
            <DashboardGrid sidebar={<span data-testid="sb">sb</span>}>
                <span data-testid="mc">mc</span>
            </DashboardGrid>
        );
        expect(screen.getByTestId('mc')).toBeTruthy();
        expect(screen.getByTestId('sb')).toBeTruthy();
    });

    it('renders a grid wrapper element', () => {
        const { container } = render(
            <DashboardGrid sidebar={<div />}>
                <div />
            </DashboardGrid>
        );
        // The root element should use CSS grid (class contains 'grid')
        const root = container.firstElementChild;
        expect(root?.className).toContain('grid');
    });
});
