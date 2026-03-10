import type { ParseHabitResponse, ParsedTimetableEntryDraft } from "@repo/store";

export type CaptureEntityType = "task" | "habit" | "exam" | "timetable_entry";
export type CaptureSource = "text" | "file" | "voice" | "image" | "pdf" | "whatsapp";

export type CaptureDraft = {
    id: string;
    entityType: CaptureEntityType;
    payload: unknown;
    confidence: number;
    source: CaptureSource;
    warnings?: string[];
};

export interface CapturedHabitDraft extends CaptureDraft {
    entityType: "habit";
    payload: ParseHabitResponse;
    draft: ParseHabitResponse;
    type: "habit";
}

export interface CapturedTimetableDraft extends CaptureDraft {
    entityType: "timetable_entry";
    payload: ParsedTimetableEntryDraft;
    draft: ParsedTimetableEntryDraft;
    type: "timetable_entry";
}

export type CapturedDraft = CapturedHabitDraft | CapturedTimetableDraft;
