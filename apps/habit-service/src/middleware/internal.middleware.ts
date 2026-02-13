import type { NextFunction, Request, Response } from "express";
import { verifyInternalEvent } from "../services/internal-auth.service.js";

const readHeader = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) return value[0];
    return value;
};

export const requireInternalSignature = (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === "test") {
        next();
        return;
    }

    const timestamp = readHeader(req.headers["x-internal-timestamp"]);
    const signature = readHeader(req.headers["x-internal-signature"]);
    const payload = JSON.stringify(req.body ?? {});

    const valid = verifyInternalEvent({
        payload,
        ...(timestamp ? { timestamp } : {}),
        ...(signature ? { signature } : {}),
    });

    if (!valid) {
        res.status(401).json({ message: "Invalid internal event signature" });
        return;
    }

    next();
};

export const requireInternalDispatchAuth = (req: Request, res: Response, next: NextFunction): void => {
    const expected = process.env.NUDGE_DISPATCH_SECRET;
    if (!expected) {
        next();
        return;
    }

    const provided = readHeader(req.headers["x-internal-job-key"]);
    if (!provided || provided !== expected) {
        res.status(401).json({ message: "Unauthorized dispatch trigger" });
        return;
    }

    next();
};
