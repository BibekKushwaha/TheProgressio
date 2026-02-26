import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@repo/db";

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const mutableErr = err as any;

    mutableErr.message = mutableErr.message || "Internal Server Error";
    mutableErr.statusCode = mutableErr.statusCode || 500;

    if (mutableErr.name === "CastError") {
        mutableErr.message = `Resource not found. Invalid: ${mutableErr.path}`;
        mutableErr.statusCode = 404;
    }

    // Prisma-specific error shaping (avoids opaque 500s for common local dev issues).
    if (err instanceof Prisma.PrismaClientInitializationError) {
        mutableErr.statusCode = 503;
        mutableErr.message =
            process.env.NODE_ENV === "production"
                ? "Database is temporarily unavailable"
                : `Database connection failed. Check DATABASE_URL and that Postgres is running. (${err.message})`;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Common local dev case: DB schema not migrated yet.
        if (err.code === "P2021") {
            mutableErr.statusCode = 500;
            mutableErr.message =
                process.env.NODE_ENV === "production"
                    ? "Server is temporarily unavailable"
                    : "Database schema is missing for this endpoint. Run Prisma migrations for packages/db and restart the service.";
        }
    }

    if (mutableErr.statusCode >= 500 && process.env.NODE_ENV !== "production") {
        // Keep this concise to avoid leaking secrets, but still actionable.
        console.error(`[planner-service] ${req.method} ${req.originalUrl} -> ${mutableErr.statusCode}: ${mutableErr.message}`);
        if (mutableErr?.stack) console.error(mutableErr.stack);
    }

    return res.status(mutableErr.statusCode).json({
        success: false,
        message: mutableErr.message,
    });
};
