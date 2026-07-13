import jwt from "jsonwebtoken";
import { AuthUser } from "../types";

const secret = process.env.JWT_SECRET || "unsafe_dev_secret";

export function signToken(user: AuthUser): string {
  return jwt.sign(user, secret, { expiresIn: "12h" });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, secret) as AuthUser;
}
