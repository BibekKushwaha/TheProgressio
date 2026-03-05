import { EFFORT_OPTIONS, effortToMinutes } from "@repo/schemas/task";

export const ANALYTICS_EFFORT_OPTIONS = EFFORT_OPTIONS;

export const effortToEstimatedMinutes = (effort: unknown): number | null => {
    return effortToMinutes(effort);
};
