import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@repo/db";

const prismaAny = prisma as any;

export interface User {
    id: string;
    username: string;
    email: string;
    dailyGoalHours: number;
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

        const decodedPayload = jwt.verify(token, process.env.JWT_SEC as string) as JwtPayload;
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
            },
        });

        if (!user) {
            res.status(401).json({ message: "User associated with this token no longer exists." });
            return;
        }

        req.user = user;
        req.authContext = { mode: "user" };
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
