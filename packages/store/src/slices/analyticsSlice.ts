import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { DailyStats, FocusScoreStats, Achievement } from '../services/analyticsApi';

export interface AnalyticsState {
    dailyStats: DailyStats | null;
    focusScore: FocusScoreStats | null;
    streak: {
        streak: number;
        activeDates: string[];
    } | null;
    achievements: Achievement[];
    pastDays: number;
    isLoading: boolean;
    error: string | null;
}

const initialState: AnalyticsState = {
    dailyStats: null,
    focusScore: null,
    streak: null,
    achievements: [],
    pastDays: 1,
    isLoading: false,
    error: null,
};

const analyticsSlice = createSlice({
    name: 'analytics',
    initialState,
    reducers: {
        setDailyStats: (state, action: PayloadAction<DailyStats>) => {
            state.dailyStats = action.payload;
        },
        setFocusScore: (state, action: PayloadAction<FocusScoreStats>) => {
            state.focusScore = action.payload;
        },
        setStreak: (state, action: PayloadAction<{ streak: number; activeDates: string[] }>) => {
            state.streak = action.payload;
        },
        setAchievements: (state, action: PayloadAction<Achievement[]>) => {
            state.achievements = action.payload;
        },
        setPastDays: (state, action: PayloadAction<number>) => {
            state.pastDays = action.payload;
        },
        setAnalyticsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setAnalyticsError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setDailyStats,
    setFocusScore,
    setStreak,
    setAchievements,
    setPastDays,
    setAnalyticsLoading,
    setAnalyticsError,
} = analyticsSlice.actions;

// Selectors
export const selectDailyStats = (state: RootState) => state.analytics.dailyStats;
export const selectFocusScore = (state: RootState) => state.analytics.focusScore;
export const selectStreak = (state: RootState) => state.analytics.streak;
export const selectAchievements = (state: RootState) => state.analytics.achievements;
export const selectPastDays = (state: RootState) => state.analytics.pastDays;
export const selectAnalyticsLoading = (state: RootState) => state.analytics.isLoading;
export const selectAnalyticsError = (state: RootState) => state.analytics.error;

export default analyticsSlice.reducer;
