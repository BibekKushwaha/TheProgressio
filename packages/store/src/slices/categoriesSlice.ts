import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Category } from '../services/categoriesApi';

export interface CategoriesState {
    categories: Category[];
    isLoading: boolean;
    error: string | null;
}

const initialState: CategoriesState = {
    categories: [],
    isLoading: false,
    error: null,
};

const categoriesSlice = createSlice({
    name: 'categories',
    initialState,
    reducers: {
        setCategories: (
            state,
            action: PayloadAction<Category[]>
        ) => {
            state.categories = action.payload;
        },
        addCategory: (state, action: PayloadAction<Category>) => {
            state.categories.push(action.payload);
        },
        removeCategory: (state, action: PayloadAction<string>) => {
            state.categories = state.categories.filter((category) => category.id !== action.payload);
        },
        updateCategory: (state, action: PayloadAction<Category>) => {
            state.categories = state.categories.map((category) =>
                category.id === action.payload.id ? action.payload : category
            );
        },
        setCategoriesLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setCategoriesError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const { setCategories, addCategory, removeCategory, updateCategory, setCategoriesLoading, setCategoriesError } = categoriesSlice.actions;

// Selectors
export const selectCategories = (state: RootState) => state.categories.categories;
export const selectCategoriesLoading = (state: RootState) => state.categories.isLoading;
export const selectCategoriesError = (state: RootState) => state.categories.error;

export default categoriesSlice.reducer;
