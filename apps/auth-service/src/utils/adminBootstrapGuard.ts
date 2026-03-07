import type { NextFunction, Request, Response } from 'express';

export const resolveAdminBootstrapClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0] ?? req.socket.remoteAddress ?? '';
  }
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? '';
  }
  return req.socket.remoteAddress ?? '';
};

export const requireAdminBootstrapIp = (req: Request, res: Response, next: NextFunction): void => {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  if (allowlist.length === 0) {
    next();
    return;
  }

  const clientIp = resolveAdminBootstrapClientIp(req);
  if (!allowlist.includes(clientIp)) {
    res.status(403).json({ message: 'Admin bootstrap access denied from this IP address.' });
    return;
  }

  next();
};