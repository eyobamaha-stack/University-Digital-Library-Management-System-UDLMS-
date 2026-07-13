"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const auth_1 = require("../services/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.nativeEnum(client_1.Role).optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
router.post("/register", async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
    }
    const { name, email, password, role } = result.data;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ message: "Email already registered" });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
            role: role ?? client_1.Role.STUDENT
        }
    });
    const token = (0, auth_1.signToken)({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
router.post("/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
    }
    const { email, password } = result.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const validPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = (0, auth_1.signToken)({ id: user.id, email: user.email, role: user.role });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.default = router;
