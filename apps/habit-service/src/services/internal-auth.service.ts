import crypto from "crypto";

const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET ?? "transition-internal-secret";
const MAX_SKEW_MS = Number.parseInt(process.env.INTERNAL_EVENT_MAX_SKEW_MS ?? `${10 * 60 * 1000}`, 10);

const safeEqual = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const computeDigest = (timestamp: string, payload: string): string =>
    crypto.createHmac("sha256", INTERNAL_EVENT_SECRET).update(`${timestamp}.${payload}`).digest("hex");

const isTimestampFresh = (timestamp: string): boolean => {
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) return false;
    return Math.abs(Date.now() - time) <= Math.max(60_000, MAX_SKEW_MS);
};

export const verifyInternalEvent = (params: {
    payload: string;
    timestamp?: string;
    signature?: string;
}): boolean => {
    if (!params.timestamp || !params.signature) return false;
    if (!isTimestampFresh(params.timestamp)) return false;
    const expected = computeDigest(params.timestamp, params.payload);
    return safeEqual(params.signature, expected);
};
