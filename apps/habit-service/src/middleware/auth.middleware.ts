import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "@repo/db";

export interface User {
    id: string;
    username: string;
    email: string;
    dailyGoalHours: number;
}

export interface AuthenticatedRequest extends Request {
    user?: User;
}

export const isAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let token = "";
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1]!;
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            res.status(401).json({
                message: "Authentication token is missing",
            });
            return;
        }

        const decodedPayload = jwt.verify(
            token,
            process.env.JWT_SEC as string
        ) as JwtPayload;

        if (!decodedPayload || !decodedPayload.id) {
            res.status(401).json({
                message: "Invalid Token",
            });
            return;
        }

        const user = await prisma.user.findUnique({
            where: {
                id: decodedPayload.id as string,
            },
            select: {
                id: true,
                username: true,
                email: true,
                dailyGoalHours: true,
            }
        });

        if (!user) {
            res.status(401).json({
                message: "User associated with this token no longer exists.",
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({
            message: "Authentication Failed. Please login again",
        });
    }
};