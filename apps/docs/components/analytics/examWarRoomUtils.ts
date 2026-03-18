import type { GradeEntry } from '@repo/store';

export const DEFAULT_EXAM_TYPE = 'JEE';

export function resolveExamType(explicitExamType?: string | null, entries?: GradeEntry[] | null): string {
    const normalizedExplicit = explicitExamType?.trim();
    if (normalizedExplicit) return normalizedExplicit;

    const inferredExamType = entries?.find((entry) => entry.examType?.trim())?.examType?.trim();
    return inferredExamType || DEFAULT_EXAM_TYPE;
}
