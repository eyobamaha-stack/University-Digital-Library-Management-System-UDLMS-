import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../services/auth";

export type RequestWithUser = Request & {
  user?: {
    id: number;
    email: string;
    role: Role;
  };
};

export function requireAuth(req: RequestWithUser, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  try {
    const token = authHeader.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(allowed: Role[]) {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
