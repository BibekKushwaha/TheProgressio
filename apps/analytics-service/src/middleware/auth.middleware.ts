import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@repo/db";
import { postJsonRequest } from "../services/internal-http.service.js";

const prismaAny = prisma as any;
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

const extractBearerToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.split(" ")[1] ?? null;
    }
    return null;
};

const hashToken = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const touchUserLastActive = (userId: string): void => {
    if (typeof prismaAny.user?.update !== "function") return;
    void prismaAny.user.update({
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
        body: { userId, source: "analytics_auth" },
        logContext: {
            service: "analytics-service",
            subsystem: "auth",
            dependency: "habit-service",
            operation: "cancel_whatsapp_fallback",
        },
    });
};

const resolveShareSession = async (rawShareToken: string): Promise<{ user: User; permissions: string; linkId: string } | null> => {
    const tokenHash = hashToken(rawShareToken);
    const link = await prismaAny.familyShareLink.findFirst({
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
            role: true,
        },
    });

    if (!user) return null;

    await prismaAny.familyShareLink.update({
        where: { id: link.id },
        data: { lastUsedAt: new Date() },
    });

    return {
        user,
        permissions: link.permissions,
        linkId: link.id,
    };
};

export const isAuth = async (
    req: AuthenticatedRequest,
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
                res.status(401).json({ message: "Invalid or expired share token" });
                return;
            }

            req.user = shareSession.user;
            req.authContext = {
                mode: "share",
                permissions: shareSession.permissions,
                shareLinkId: shareSession.linkId,
            };
            next();
            return;
        }

        let token = "";
        if (bearerToken) {
            token = bearerToken;
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            res.status(401).json({ message: "Authentication token is missing" });
            return;
        }

        const decodedPayload = jwt.verify(token, process.env.JWT_SEC as string, {
            algorithms: ["HS256"],
        }) as JwtPayload;
        if (!decodedPayload?.id) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }

        // Reject tokens that have been blacklisted (e.g. after logout)
        try {
            const mod = (await import('@repo/cache').catch(() => null)) as any;
            if (mod?.getCache) {
                const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                const blacklisted = await mod.getCache(`bl:${tokenHash}`);
                if (blacklisted) {
                    res.status(401).json({ message: 'Token has been revoked' });
                    return;
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
            res.status(401).json({ message: "User associated with this token no longer exists." });
            return;
        }

        req.user = user;
        req.authContext = { mode: "user" };
        touchUserLastActive(user.id);
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Authentication failed. Please login again" });
    }
};

export const enforceReadOnlyWrites = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): void => {
    const isWriteMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
    if (isWriteMethod && req.authContext?.mode === "share") {
        res.status(403).json({ message: "Read-only access: write operations are not allowed" });
        return;
    }
    next();
};

// ---------------------------------------------------------------------------
// isAdmin — must be chained AFTER isAuth
// ---------------------------------------------------------------------------
export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    if (req.user.role !== "ADMIN") {
        res.status(403).json({ message: "Admin access required" });
        return;
    }
    next();
};

// ---------------------------------------------------------------------------
// adminRateLimit — 60 req / 15 min per user ID or IP
// ---------------------------------------------------------------------------
export const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = (req as AuthenticatedRequest).user?.id;
        if (userId) return `admin:user:${userId}`;
        const forwarded = req.headers["x-forwarded-for"];
        const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
        return `admin:ip:${ip ?? req.socket.remoteAddress ?? "unknown"}`;
    },
    message: { message: "Too many admin requests \u2014 please slow down" },
});

// ---------------------------------------------------------------------------
// requireAdminIp — optional IP allowlist (ADMIN_IP_ALLOWLIST env var)
// ---------------------------------------------------------------------------
export const requireAdminIp = (req: Request, res: Response, next: NextFunction): void => {
    const allowlist = process.env.ADMIN_IP_ALLOWLIST?.split(",").map((s) => s.trim()).filter(Boolean);
    if (!allowlist || allowlist.length === 0) {
        return next();
    }
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
    const remoteIp = clientIp ?? req.socket?.remoteAddress ?? "";
    if (!allowlist.includes(remoteIp)) {
        res.status(403).json({ message: "Access denied: IP not in admin allowlist" });
        return;
    }
    next();
};
