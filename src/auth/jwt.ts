import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
