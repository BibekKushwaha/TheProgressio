/**
 * Unit tests for RTK Query API definitions — analyticsApi
 *
 * Verifies all endpoint registrations for both existing and Phase 3 features.
 */
import { describe, it, expect } from 'vitest';
import { analyticsApi } from '../src/services/analyticsApi';

describe('analyticsApi — Endpoint Configuration', () => {
    const endpoints = analyticsApi.endpoints;

    // ── Existing Endpoints ─────────────────────────────────────────────

    it('has logSession mutation', () => {
        expect(endpoints).toHaveProperty('logSession');
    });

    it('has getActiveLiveSession query', () => {
        expect(endpoints).toHaveProperty('getActiveLiveSession');
    });

    it('has startLiveSession mutation', () => {
        expect(endpoints).toHaveProperty('startLiveSession');
    });

    it('has pauseLiveSession mutation', () => {
        expect(endpoints).toHaveProperty('pauseLiveSession');
    });

    it('has resumeLiveSession mutation', () => {
        expect(endpoints).toHaveProperty('resumeLiveSession');
    });

    it('has heartbeatLiveSession mutation', () => {
        expect(endpoints).toHaveProperty('heartbeatLiveSession');
    });

    it('has stopLiveSession mutation', () => {
        expect(endpoints).toHaveProperty('stopLiveSession');
    });

    it('has getDailySummary query', () => {
        expect(endpoints).toHaveProperty('getDailySummary');
    });

    it('has getWeeklyTrends query', () => {
        expect(endpoints).toHaveProperty('getWeeklyTrends');
    });

    it('has getTaskEfficiency query', () => {
        expect(endpoints).toHaveProperty('getTaskEfficiency');
    });

    it('has getFocusScore query', () => {
        expect(endpoints).toHaveProperty('getFocusScore');
    });

    it('has getUserStreak query', () => {
        expect(endpoints).toHaveProperty('getUserStreak');
    });

    it('has getAchievements query', () => {
        expect(endpoints).toHaveProperty('getAchievements');
    });

    // ── Phase 3: Prediction ────────────────────────────────────────────

    it('has getPrediction query', () => {
        expect(endpoints).toHaveProperty('getPrediction');
    });

    it('has getCycleTime query', () => {
        expect(endpoints).toHaveProperty('getCycleTime');
    });

    // ── Phase 3: SWOT ──────────────────────────────────────────────────

    it('has getSWOTAnalysis query', () => {
        expect(endpoints).toHaveProperty('getSWOTAnalysis');
    });

    it('has getSubjectPerformance query', () => {
        expect(endpoints).toHaveProperty('getSubjectPerformance');
    });

    // ── Phase 3: GPA ───────────────────────────────────────────────────

    it('has getGPA query', () => {
        expect(endpoints).toHaveProperty('getGPA');
    });

    it('has whatIfGPA mutation', () => {
        expect(endpoints).toHaveProperty('whatIfGPA');
    });

    it('has addCourseGrade mutation', () => {
        expect(endpoints).toHaveProperty('addCourseGrade');
    });

    it('has updateCourseGrade mutation', () => {
        expect(endpoints).toHaveProperty('updateCourseGrade');
    });

    it('has deleteCourseGrade mutation', () => {
        expect(endpoints).toHaveProperty('deleteCourseGrade');
    });

    // ── Phase 3: Grade Entries ─────────────────────────────────────────

    it('has addGradeEntry mutation', () => {
        expect(endpoints).toHaveProperty('addGradeEntry');
    });

    it('has getGradeEntries query', () => {
        expect(endpoints).toHaveProperty('getGradeEntries');
    });

    it('has deleteGradeEntry mutation', () => {
        expect(endpoints).toHaveProperty('deleteGradeEntry');
    });

    // ── Phase 3: Focus & Leakage ───────────────────────────────────────

    it('has getTimeLeakage query', () => {
        expect(endpoints).toHaveProperty('getTimeLeakage');
    });

    it('has getPeakWindow query', () => {
        expect(endpoints).toHaveProperty('getPeakWindow');
    });

    it('has getPredictivePerformance query', () => {
        expect(endpoints).toHaveProperty('getPredictivePerformance');
    });
});

describe('analyticsApi — Reducer & Middleware', () => {
    it('has reducerPath "analyticsApi"', () => {
        expect(analyticsApi.reducerPath).toBe('analyticsApi');
    });

    it('exports the reducer function', () => {
        expect(typeof analyticsApi.reducer).toBe('function');
    });

    it('exports middleware function', () => {
        expect(typeof analyticsApi.middleware).toBe('function');
    });
});

describe('analyticsApi — Total endpoint count', () => {
    it('has exactly 29 endpoints', () => {
        const endpointCount = Object.keys(analyticsApi.endpoints).length;
        expect(endpointCount).toBe(29);
    });
});
