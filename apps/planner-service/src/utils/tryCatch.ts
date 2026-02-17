import type { Response, NextFunction, RequestHandler } from "express";
import ErrorHandler from "./errorHandler.js";

export const TryCatch =
    (
        controller: (
            req: any,
            res: Response,
            next: NextFunction
        ) => Promise<any>
    ): RequestHandler =>
        async (req, res, next) => {
            try {
                await controller(req, res, next);
            } catch (error: any) {
                if (error instanceof ErrorHandler) {
                    return res.status(error.statusCode).json({
                        message: error.message,
                    });
                }

                console.error("TryCatch Caught Error:", error);

                res.status(500).json({
                    message: error.message || "Internal Server Error",
                });
            }
        };
