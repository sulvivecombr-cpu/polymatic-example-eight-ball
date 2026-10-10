import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";
import { verifyToken, type JwtPayload } from "./jwt";

const COOKIE_NAME = "pa_token";

/** Express middleware: extracts user from cookie, attaches to req.user */
export function expressAuth(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

/** Express middleware: requires authentication */
export function requireAuth(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

/** Express middleware: requires admin */
export function requireAdmin(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  next();
}

/** Socket.io middleware: extracts user from handshake auth */
export function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (socket as any).user = payload;
    }
  }
  next();
}

export { COOKIE_NAME };
export type { JwtPayload };
