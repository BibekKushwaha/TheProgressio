import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let _isAIDisabled = false;

vi.mock('@repo/store', () => ({
    isAIAssistanceDisabled: () => _isAIDisabled,
    setAIAssistanceDisabled: vi.fn((val: boolean) => { _isAIDisabled = val; }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { usePrivacySettingsController } from '../hooks/usePrivacySettingsController';
import { setAIAssistanceDisabled } from '@repo/store';
import { toast } from 'sonner';

describe('usePrivacySettingsController', () => {
    beforeEach(() => {
        _isAIDisabled = false;
        vi.clearAllMocks();
    });

    it('reads initial aiDisabled from store', () => {
        _isAIDisabled = false;
        const { result } = renderHook(() => usePrivacySettingsController());
        expect(result.current.aiDisabled).toBe(false);
    });

    it('reflects store value of true on mount', () => {
        _isAIDisabled = true;
        const { result } = renderHook(() => usePrivacySettingsController());
        expect(result.current.aiDisabled).toBe(true);
    });

    it('toggleAiAssistance(false) disables AI and updates store', () => {
        const { result } = renderHook(() => usePrivacySettingsController());
        act(() => result.current.toggleAiAssistance(false));
        expect(result.current.aiDisabled).toBe(true);
        expect(setAIAssistanceDisabled).toHaveBeenCalledWith(true);
    });

    it('toggleAiAssistance(true) enables AI and updates store', () => {
        _isAIDisabled = true;
        const { result } = renderHook(() => usePrivacySettingsController());
        act(() => result.current.toggleAiAssistance(true));
        expect(result.current.aiDisabled).toBe(false);
        expect(setAIAssistanceDisabled).toHaveBeenCalledWith(false);
    });

    it('shows success toast when disabling AI', () => {
        const { result } = renderHook(() => usePrivacySettingsController());
        act(() => result.current.toggleAiAssistance(false));
        expect(toast.success).toHaveBeenCalledWith('AI assistance disabled');
    });

    it('shows success toast when enabling AI', () => {
        _isAIDisabled = true;
        const { result } = renderHook(() => usePrivacySettingsController());
        act(() => result.current.toggleAiAssistance(true));
        expect(toast.success).toHaveBeenCalledWith('AI assistance enabled');
    });
});
