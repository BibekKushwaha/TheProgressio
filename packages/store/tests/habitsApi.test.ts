/**
 * Unit tests for RTK Query API definitions — habitsApi
 *
 * Verifies endpoint configuration, types, and tag invalidation logic
 * without needing a real server. Tests the API slice shape only.
 */
import { describe, it, expect } from 'vitest';
import type { ParseHabitResponse } from '../src/services/habitsApi';
import { Frequency, habitsApi } from '../src/services/habitsApi';

describe('habitsApi — Endpoint Configuration', () => {
    const endpoints = habitsApi.endpoints;

    // ── Existing Endpoints ─────────────────────────────────────────────

    it('has getHabits query endpoint', () => {
        expect(endpoints).toHaveProperty('getHabits');
    });

    it('has getHabitStats query endpoint', () => {
        expect(endpoints).toHaveProperty('getHabitStats');
    });

    it('has createHabit mutation endpoint', () => {
        expect(endpoints).toHaveProperty('createHabit');
    });

    it('has parseHabit mutation endpoint', () => {
        expect(endpoints).toHaveProperty('parseHabit');
    });

    it('has updateHabit mutation endpoint', () => {
        expect(endpoints).toHaveProperty('updateHabit');
    });

    it('has deleteHabit mutation endpoint', () => {
        expect(endpoints).toHaveProperty('deleteHabit');
    });

    it('has logHabit mutation endpoint', () => {
        expect(endpoints).toHaveProperty('logHabit');
    });

    it('has resetHabit mutation endpoint', () => {
        expect(endpoints).toHaveProperty('resetHabit');
    });

    // ── Phase 2 Endpoints ──────────────────────────────────────────────

    it('has getUserXP query endpoint', () => {
        expect(endpoints).toHaveProperty('getUserXP');
    });

    it('has getContributionHeatmap query endpoint', () => {
        expect(endpoints).toHaveProperty('getContributionHeatmap');
    });

    it('has getNudges query endpoint', () => {
        expect(endpoints).toHaveProperty('getNudges');
    });

    it('has markNudgeAsRead mutation endpoint', () => {
        expect(endpoints).toHaveProperty('markNudgeAsRead');
    });

    it('has markAllNudgesAsRead mutation endpoint', () => {
        expect(endpoints).toHaveProperty('markAllNudgesAsRead');
    });

    it('has getMorningBriefing query endpoint', () => {
        expect(endpoints).toHaveProperty('getMorningBriefing');
    });
});

describe('habitsApi — Reducer & Tag Types', () => {
    it('has reducerPath "habitsApi"', () => {
        expect(habitsApi.reducerPath).toBe('habitsApi');
    });

    it('exports the reducer', () => {
        expect(habitsApi.reducer).toBeDefined();
        expect(typeof habitsApi.reducer).toBe('function');
    });

    it('exports middleware', () => {
        expect(habitsApi.middleware).toBeDefined();
        expect(typeof habitsApi.middleware).toBe('function');
    });

    it('types parsed habit responses with schedule hints', () => {
        const response: ParseHabitResponse = {
            name: 'Read',
            frequency: Frequency.DAILY,
            targetValue: 5,
            unit: 'pages',
            scheduleHint: 'night',
            reminderTime: null,
            confidence: 0.8,
        };

        expect(response.scheduleHint).toBe('night');
    });
});
