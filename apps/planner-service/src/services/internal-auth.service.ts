import crypto from "crypto";

const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET ?? "transition-internal-secret";

const safeCompare = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const buildDigest = (timestamp: string, payload: string): string =>
    crypto.createHmac("sha256", INTERNAL_EVENT_SECRET).update(`${timestamp}.${payload}`).digest("hex");

export const buildInternalEventHeaders = (payload: unknown): Record<string, string> => {
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify(payload);

    return {
        "x-internal-source": "planner-service",
        "x-internal-signature": buildDigest(timestamp, serialized),
        "x-internal-timestamp": timestamp,
        "Content-Type": "application/json",
    };
};

export const verifyInternalEventSignature = (params: {
    payload: string;
    timestamp?: string;
    signature?: string;
}): boolean => {
    if (!params.timestamp || !params.signature) return false;
    const expected = buildDigest(params.timestamp, params.payload);
    return safeCompare(params.signature, expected);
};
