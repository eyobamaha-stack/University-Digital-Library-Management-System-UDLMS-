"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.post("/notifications/mock", auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.LIBRARIAN, client_1.Role.ADMIN]), async (req, res) => {
    const payload = zod_1.z
        .object({
        userId: zod_1.z.number().int().positive(),
        channel: zod_1.z.enum(["email", "sms"]),
        subject: zod_1.z.string().min(2),
        message: zod_1.z.string().min(2)
    })
        .safeParse(req.body);
    if (!payload.success) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "MOCK_NOTIFICATION_SENT",
            entity: `User:${payload.data.userId}`,
            details: `${payload.data.channel}:${payload.data.subject}`
        }
    });
    return res.status(202).json({
        queued: true,
        provider: "mock",
        ...payload.data
    });
});
exports.default = router;
