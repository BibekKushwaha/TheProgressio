import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── mock document.visibilityState via a getter ──────────────────────────────
function setVisibilityState(value: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => value,
    });
    act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
    });
}

import { usePageVisibility } from '../hooks/usePageVisibility';

describe('usePageVisibility', () => {
    afterEach(() => {
        // Reset to visible after each test
        setVisibilityState('visible');
    });

    it('returns true when the document is visible on mount', () => {
        setVisibilityState('visible');
        const { result } = renderHook(() => usePageVisibility());
        expect(result.current).toBe(true);
    });

    it('returns false when visibility changes to hidden', () => {
        setVisibilityState('visible');
        const { result } = renderHook(() => usePageVisibility());
        expect(result.current).toBe(true);

        setVisibilityState('hidden');
        expect(result.current).toBe(false);
    });

    it('returns true again after visibility is restored', () => {
        setVisibilityState('hidden');
        const { result } = renderHook(() => usePageVisibility());

        setVisibilityState('visible');
        expect(result.current).toBe(true);
    });

    it('removes the event listener on unmount', () => {
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() => usePageVisibility());
        unmount();
        expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        removeSpy.mockRestore();
    });
});
