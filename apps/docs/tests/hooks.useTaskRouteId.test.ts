import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Keep a mutable ref our per-test mock can write to
let mockParams: Record<string, string | string[]> = {};

vi.mock('next/navigation', () => ({
    useParams: () => mockParams,
}));

import { useTaskRouteId } from '../hooks/useTaskRouteId';

describe('useTaskRouteId', () => {
    beforeEach(() => {
        mockParams = {};
    });

    it('returns undefined when params are empty', () => {
        mockParams = {};
        const { result } = renderHook(() => useTaskRouteId());
        expect(result.current).toBeUndefined();
    });

    it('returns the string id directly', () => {
        mockParams = { id: 'abc-123' };
        const { result } = renderHook(() => useTaskRouteId());
        expect(result.current).toBe('abc-123');
    });

    it('returns the first element when id is an array', () => {
        mockParams = { id: ['first', 'second'] };
        const { result } = renderHook(() => useTaskRouteId());
        expect(result.current).toBe('first');
    });

    it('returns undefined for an empty string id', () => {
        mockParams = { id: '' };
        const { result } = renderHook(() => useTaskRouteId());
        expect(result.current).toBeUndefined();
    });

    it('returns undefined for an empty array id', () => {
        mockParams = { id: [] };
        const { result } = renderHook(() => useTaskRouteId());
        expect(result.current).toBeUndefined();
    });
});
