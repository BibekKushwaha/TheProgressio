type LowInputTelemetryEventName =
    | "timetable_preview_requested"
    | "timetable_preview_succeeded"
    | "timetable_preview_failed"
    | "timetable_import_completed"
    | "habit_parse_requested"
    | "habit_parse_succeeded"
    | "habit_parse_failed"
    | "habit_quick_create_completed";

type LowInputTelemetryPayload = {
    event: LowInputTelemetryEventName;
    at: string;
    source: "text" | "file";
    [key: string]: string | number | boolean | null | undefined;
};

const TELEMETRY_EVENT_NAME = "app:low_input_capture";
const LOW_INPUT_TELEMETRY_ENDPOINT = "/api/low-input-telemetry";

const isBrowser = (): boolean => typeof window !== "undefined";

const emitTelemetry = (payload: LowInputTelemetryPayload): void => {
    if (!isBrowser()) return;

    window.dispatchEvent(new CustomEvent(TELEMETRY_EVENT_NAME, { detail: payload }));

    const endpoint = process.env.NEXT_PUBLIC_LOW_INPUT_TELEMETRY_URL || LOW_INPUT_TELEMETRY_ENDPOINT;
    if (!endpoint || typeof navigator.sendBeacon !== "function") {
        return;
    }

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
};

export const trackLowInputEvent = (
    event: LowInputTelemetryEventName,
    source: "text" | "file",
    details: Record<string, string | number | boolean | null | undefined> = {},
): void => {
    emitTelemetry({
        event,
        source,
        at: new Date().toISOString(),
        ...details,
    });
};

export const getTimetableConfidenceBucket = (confidence: number): "high" | "medium" | "low" => {
    if (confidence > 0.8) return "high";
    if (confidence >= 0.5) return "medium";
    return "low";
};

export const summarizeConfidenceBuckets = (
    confidences: number[],
): { high: number; medium: number; low: number } =>
    confidences.reduce(
        (summary, confidence) => {
            const bucket = getTimetableConfidenceBucket(confidence);
            summary[bucket] += 1;
            return summary;
        },
        { high: 0, medium: 0, low: 0 },
    );
