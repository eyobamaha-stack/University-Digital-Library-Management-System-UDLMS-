import { Role } from "@prisma/client";

export type AuthUser = {
  id: number;
  email: string;
  role: Role;
};

export type JwtPayload = AuthUser;
