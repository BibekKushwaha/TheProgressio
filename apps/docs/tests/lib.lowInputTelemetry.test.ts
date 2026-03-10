import { describe, expect, it, vi } from 'vitest';
import { summarizeConfidenceBuckets, trackLowInputEvent } from '@/lib/lowInputTelemetry';

describe('lowInputTelemetry', () => {
    it('summarizes confidence values into high/medium/low buckets', () => {
        expect(summarizeConfidenceBuckets([0.92, 0.8, 0.6, 0.2])).toEqual({
            high: 1,
            medium: 2,
            low: 1,
        });
    });

    it('dispatches a browser event for low-input telemetry', () => {
        const listener = vi.fn();
        window.addEventListener('app:low_input_capture', listener as EventListener);

        trackLowInputEvent('habit_parse_succeeded', 'text', {
            confidence: 0.8,
            has_unit: true,
        });

        expect(listener).toHaveBeenCalledTimes(1);
        const event = listener.mock.calls[0]?.[0] as CustomEvent;
        expect(event.detail).toMatchObject({
            event: 'habit_parse_succeeded',
            source: 'text',
            confidence: 0.8,
            has_unit: true,
        });

        window.removeEventListener('app:low_input_capture', listener as EventListener);
    });

    it('sends telemetry to the first-party endpoint by default', () => {
        const originalSendBeacon = navigator.sendBeacon;
        const sendBeacon = vi.fn().mockReturnValue(true);
        Object.defineProperty(navigator, 'sendBeacon', {
            value: sendBeacon,
            configurable: true,
            writable: true,
        });

        trackLowInputEvent('timetable_preview_requested', 'text', { input_length: 42 });

        expect(sendBeacon).toHaveBeenCalledTimes(1);
        expect(sendBeacon.mock.calls[0]?.[0]).toBe('/api/low-input-telemetry');

        Object.defineProperty(navigator, 'sendBeacon', {
            value: originalSendBeacon,
            configurable: true,
            writable: true,
        });
    });
});
