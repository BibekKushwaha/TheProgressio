import type { NextFunction, Request, Response } from "express";

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    err.message = err.message || "Internal Server Error";
    err.statusCode = err.statusCode || 500;

    if (err.name === "CastError") {
        err.message = `Resource not found. Invalid: ${err.path}`;
        err.statusCode = 404;
    }

    return res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
};
