import type { CaptureSource } from "./capture.types";

export const CAPTURE_SOURCES: CaptureSource[] = ["text", "file", "voice", "image", "pdf", "whatsapp"];

export const getCaptureSourceFromFile = (mimeType?: string | null): CaptureSource => {
    if (!mimeType) return "file";
    const normalized = mimeType.trim().toLowerCase();
    if (normalized.startsWith("image/")) return "image";
    if (normalized.includes("pdf")) return "pdf";
    return "file";
};
