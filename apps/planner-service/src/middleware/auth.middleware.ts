import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@repo/db";
import ErrorHandler from "../utils/errorHandler.js";
import { postJsonRequest } from "../services/internal-http.service.js";

const HABIT_SERVICE_URL = process.env.HABIT_SERVICE_URL || "http://localhost:4002";
const HABIT_INTERNAL_SECRET = process.env.HABIT_INTERNAL_SECRET || process.env.ANALYTICS_INTERNAL_SECRET || "";
const ACTIVITY_CANCEL_DEBOUNCE_MS = Math.max(
    5_000,
    Number.parseInt(process.env.WHATSAPP_ACTIVITY_CANCEL_DEBOUNCE_MS ?? "60000", 10),
);
const lastCancellationSignalAt = new Map<string, number>();

export interface User {
    id: string;
    username: string;
    email: string;
    dailyGoalHours: number;
    role: string; // "USER" | "ADMIN"
}

export interface AuthContext {
    mode: "user" | "share";
    permissions?: string;
    shareLinkId?: string;
}

export interface AuthenticatedRequest extends Request {
    user?: User;
    authContext?: AuthContext;
}

const readStringHeader = (value: string | string[] | undefined): string | null => {
    if (Array.isArray(value)) return value[0] ?? null;
    return typeof value === "string" ? value : null;
};

const extractBearerToken = (req: any): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.split(" ")[1] ?? null;
    }
    return null;
};

const hashToken = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const touchUserLastActive = (userId: string): void => {
    void prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
    }).catch((_error: unknown) => {
    });

    if (!HABIT_INTERNAL_SECRET) return;

    const nowMs = Date.now();
    const lastSignalMs = lastCancellationSignalAt.get(userId) ?? 0;
    if (nowMs - lastSignalMs < ACTIVITY_CANCEL_DEBOUNCE_MS) return;
    lastCancellationSignalAt.set(userId, nowMs);

    void postJsonRequest({
        url: `${HABIT_SERVICE_URL}/api/habits/internal/wa-fallback/cancel`,
        headers: {
            "x-internal-secret": HABIT_INTERNAL_SECRET,
        },
        body: { userId, source: "planner_auth" },
        logContext: {
            service: "planner-service",
            subsystem: "auth",
            dependency: "habit-service",
            operation: "cancel_whatsapp_fallback",
        },
    });
};

const resolveShareSession = async (rawShareToken: string): Promise<{ user: User; permissions: string; linkId: string } | null> => {
    const tokenHash = hashToken(rawShareToken);
    const link = await prisma.familyShareLink.findFirst({
        where: {
            tokenHash,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
            id: true,
            userId: true,
            permissions: true,
        },
    });

    if (!link) return null;

    const user = await prisma.user.findUnique({
        where: { id: link.userId },
        select: {
            id: true,
            username: true,
            email: true,
            dailyGoalHours: true,
        },
    });

    if (!user) return null;

    await prisma.familyShareLink.update({
        where: { id: link.id },
        data: { lastUsedAt: new Date() },
    });

    return {
        user: user as User,
        permissions: link.permissions,
        linkId: link.id,
    };
};

export const isAuth = async (
    req: any,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const bearerToken = extractBearerToken(req);
        const shareTokenHeader = readStringHeader(req.headers["x-family-share-token"]);
        const candidateShareToken =
            shareTokenHeader ??
            (bearerToken && bearerToken.startsWith("fml_") ? bearerToken : null);

        if (candidateShareToken) {
            const shareSession = await resolveShareSession(candidateShareToken);
            if (!shareSession) {
                return next(new ErrorHandler(401, "Invalid or expired share token"));
            }

            req.user = shareSession.user;
            req.authContext = {
                mode: "share",
                permissions: shareSession.permissions,
                shareLinkId: shareSession.linkId,
            };
            return next();
        }

        let token = "";
        if (bearerToken) {
            token = bearerToken;
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return next(new ErrorHandler(401, "Authentication token is missing"));
        }

        const decodedPayload = jwt.verify(token, process.env.JWT_SEC as string, {
            algorithms: ["HS256"],
        }) as JwtPayload;
        if (!decodedPayload?.id) {
            return next(new ErrorHandler(401, "Invalid token"));
        }

        // Reject tokens that have been blacklisted (e.g. after logout)
        try {
            const mod = (await import('@repo/cache').catch(() => null)) as any;
            if (mod?.getCache) {
                const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                const blacklisted = await mod.getCache(`bl:${tokenHash}`);
                if (blacklisted) {
                    return next(new ErrorHandler(401, "Token has been revoked"));
                }
            }
        } catch { /* non-blocking */ }

        const user = await prisma.user.findUnique({
            where: { id: decodedPayload.id as string },
            select: {
                id: true,
                username: true,
                email: true,
                dailyGoalHours: true,
                role: true,
            },
        });

        if (!user) {
            return next(new ErrorHandler(401, "User associated with this token no longer exists."));
        }

        req.user = user as User;
        req.authContext = { mode: "user" };
        touchUserLastActive(user.id);
        next();
    } catch (_error) {
        return next(new ErrorHandler(401, "Authentication failed. Please login again"));
    }
};

type EnforceOptions = { allowShareWritesFor?: string[] };

const buildReadOnlyMiddleware = (options?: EnforceOptions) => {
    const allow = new Set((options?.allowShareWritesFor ?? []).map((p) => p.trim().toUpperCase()).filter(Boolean));

    return (req: any, _res: Response, next: NextFunction): void => {
        const isWriteMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
        if (isWriteMethod && req.authContext?.mode === "share") {
            const permission = typeof req.authContext?.permissions === "string"
                ? req.authContext.permissions.trim().toUpperCase()
                : "";
            if (!allow.has(permission)) {
                throw new ErrorHandler(403, "Read-only access: write operations are not allowed");
            }
        }
        next();
    };
};

/**
 * Backwards-compatible usage:
 * - `enforceReadOnlyWrites(req, res, next)`  (legacy middleware signature)
 * - `enforceReadOnlyWrites(options)` -> middleware
 */
export const enforceReadOnlyWrites: any = (arg1?: any, arg2?: any, arg3?: any) => {
    if (typeof arg3 === "function") {
        return buildReadOnlyMiddleware()(arg1, arg2, arg3);
    }
    return buildReadOnlyMiddleware(arg1 as EnforceOptions | undefined);
};

// ---------------------------------------------------------------------------
// isAdmin — must be chained AFTER isAuth
// Passes only if req.user.role === "ADMIN".
// ---------------------------------------------------------------------------

export const isAdmin = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
        return next(new ErrorHandler(401, "Authentication required"));
    }
    if (req.user.role !== "ADMIN") {
        return next(new ErrorHandler(403, "Admin access required"));
    }
    next();
};

// ---------------------------------------------------------------------------
// adminRateLimit — strict rate limit for admin/revenue endpoints.
// 60 req / 15 min per IP — prevents enumeration and scraping.
// ---------------------------------------------------------------------------

export const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Key on authenticated user ID when available, fall back to IP
        const userId = (req as AuthenticatedRequest).user?.id;
        if (userId) return `admin:user:${userId}`;
        const forwarded = req.headers["x-forwarded-for"];
        const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
        return `admin:ip:${ip ?? req.socket.remoteAddress ?? "unknown"}`;
    },
    message: { message: "Too many admin requests — please slow down" },
});

// ---------------------------------------------------------------------------
// requireAdminIp — optional IP allowlist.
// Set ADMIN_IP_ALLOWLIST="1.2.3.4,5.6.7.8" in env to enable.
// When the env var is absent or empty, the check is a no-op (pass-through).
// ---------------------------------------------------------------------------

export const requireAdminIp = (req: Request, _res: Response, next: NextFunction): void => {
    const allowlist = process.env.ADMIN_IP_ALLOWLIST?.split(",").map((s) => s.trim()).filter(Boolean);
    if (!allowlist || allowlist.length === 0) {
        // No allowlist configured — restriction disabled
        return next();
    }
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp  = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
    const remoteIp  = clientIp ?? req.socket?.remoteAddress ?? "";

    if (!allowlist.includes(remoteIp)) {
        return next(new ErrorHandler(403, "Access denied: IP not in admin allowlist"));
    }
    next();
};
