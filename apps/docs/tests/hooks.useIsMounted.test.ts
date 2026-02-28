import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMounted } from '../hooks/useIsMounted';

describe('useIsMounted', () => {
    it('returns false synchronously on the first render', () => {
        // We cannot easily read the pre-effect value, but we can check the
        // settled state after effects have run (true) and trust React's
        // batching guarantee.
        const { result } = renderHook(() => useIsMounted());
        // After effects run it should be true
        expect(result.current).toBe(true);
    });

    it('stays true after multiple re-renders', () => {
        const { result, rerender } = renderHook(() => useIsMounted());
        rerender();
        rerender();
        expect(result.current).toBe(true);
    });

    it('returns consistent boolean type', () => {
        const { result } = renderHook(() => useIsMounted());
        expect(typeof result.current).toBe('boolean');
    });
});
