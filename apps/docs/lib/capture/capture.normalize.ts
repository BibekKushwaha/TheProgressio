import type { ParseHabitResponse, ParsedTimetableEntryDraft } from "@repo/store";
import type { CaptureSource, CapturedHabitDraft, CapturedTimetableDraft } from "./capture.types";
import { clampConfidence } from "./capture.confidence";
import { normalizeWarnings } from "./capture.warnings";

export const toCapturedHabitDraft = (
    draft: ParseHabitResponse,
    source: CaptureSource = "text",
): CapturedHabitDraft => ({
    id: `habit:${draft.name}:${draft.frequency}`,
    entityType: "habit",
    type: "habit",
    source,
    confidence: clampConfidence(draft.confidence),
    payload: draft,
    draft,
    warnings: [],
});

export const toCapturedTimetableDrafts = (
    entries: ParsedTimetableEntryDraft[],
    source: CaptureSource = "text",
): CapturedTimetableDraft[] =>
    entries.map((entry, index) => ({
        id: `timetable:${entry.subjectName}:${entry.dayOfWeek ?? "x"}:${entry.startTime ?? "x"}:${index}`,
        entityType: "timetable_entry",
        type: "timetable_entry",
        source,
        confidence: clampConfidence(entry.confidence),
        payload: entry,
        draft: entry,
        warnings: normalizeWarnings(entry.warnings),
    }));
