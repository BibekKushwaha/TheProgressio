'use client';

import { useMemo } from 'react';
import { useGetGradeEntriesQuery } from '@repo/store';

/**
 * Infers the user's exam type from their most recent grade entry.
 * Falls back to 'JEE' when no entries exist yet.
 *
 * Mirrors the inference logic already used in PredictiveScoreCard so all
 * analytics pages share the same RTK Query cache entry for grade entries.
 */
export function useExamType(): string {
    const { data: entriesData } = useGetGradeEntriesQuery(undefined);
    return useMemo(
        () => entriesData?.entries?.[0]?.examType?.trim() || 'JEE',
        [entriesData?.entries]
    );
}
