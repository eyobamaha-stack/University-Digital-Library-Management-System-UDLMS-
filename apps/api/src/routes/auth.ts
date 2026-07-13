import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken } from "../services/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
  }

  const { name, email, password, role } = result.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role ?? Role.STUDENT
    }
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
  }

  const { email, password } = result.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
