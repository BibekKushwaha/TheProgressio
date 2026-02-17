import type { NextFunction, Request, Response } from "express";
import { verifyInternalEvent } from "../services/internal-auth.service.js";
import ErrorHandler from "../utils/errorHandler.js";

const readHeader = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) return value[0];
    return value;
};

export const requireInternalSignature = (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === "test") {
        return next();
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
        return next(new ErrorHandler(401, "Invalid internal event signature"));
    }

    next();
};

export const requireInternalDispatchAuth = (req: Request, res: Response, next: NextFunction): void => {
    const expected = process.env.NUDGE_DISPATCH_SECRET;
    if (!expected) {
        return next();
    }

    const provided = readHeader(req.headers["x-internal-job-key"]);
    if (!provided || provided !== expected) {
        return next(new ErrorHandler(401, "Unauthorized dispatch trigger"));
    }

    next();
};

export const requireInternalReadAuth = (req: Request, res: Response, next: NextFunction): void => {
    const expected = process.env.HABIT_INTERNAL_SECRET ?? process.env.ANALYTICS_INTERNAL_SECRET;
    if (!expected) {
        return next();
    }

    const provided = readHeader(req.headers["x-internal-secret"]);
    if (!provided || provided !== expected) {
        return next(new ErrorHandler(401, "Unauthorized internal read"));
    }

    next();
};
