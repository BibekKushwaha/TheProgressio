import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Habit } from '../services/habitsApi';

export interface HabitsState {
    habits: Habit[];
    isLoading: boolean;
    error: string | null;
}

const initialState: HabitsState = {
    habits: [],
    isLoading: false,
    error: null,
};

const habitsSlice = createSlice({
    name: 'habits',
    initialState,
    reducers: {
        setHabits: (
            state,
            action: PayloadAction<Habit[]>
        ) => {
            state.habits = action.payload;
        },
        addHabit: (state, action: PayloadAction<Habit>) => {
            state.habits.push(action.payload);
        },
        removeHabit: (state, action: PayloadAction<string>) => {
            state.habits = state.habits.filter((habit) => habit.id !== action.payload);
        },
        updateHabitState: (state, action: PayloadAction<Habit>) => {
            state.habits = state.habits.map((habit) =>
                habit.id === action.payload.id ? action.payload : habit
            );
        },
        setHabitsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setHabitsError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setHabits,
    addHabit,
    removeHabit,
    updateHabitState,
    setHabitsLoading,
    setHabitsError
} = habitsSlice.actions;

// Selectors
export const selectHabits = (state: RootState) => state.habits.habits;
export const selectHabitsLoading = (state: RootState) => state.habits.isLoading;
export const selectHabitsError = (state: RootState) => state.habits.error;

export default habitsSlice.reducer;
