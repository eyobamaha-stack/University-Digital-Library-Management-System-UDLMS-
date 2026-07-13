"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.ADMIN]));
router.get("/policy", async (_, res) => {
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: 1 } });
    res.json(policy);
});
router.put("/policy", async (req, res) => {
    const payload = zod_1.z
        .object({
        loanDays: zod_1.z.number().int().min(1).max(60),
        maxRenewals: zod_1.z.number().int().min(0).max(10),
        finePerDayCents: zod_1.z.number().int().min(0).max(1000),
        holdDays: zod_1.z.number().int().min(1).max(30)
    })
        .safeParse(req.body);
    if (!payload.success) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    const policy = await prisma_1.prisma.policy.upsert({
        where: { id: 1 },
        update: payload.data,
        create: { id: 1, ...payload.data }
    });
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "POLICY_UPDATED",
            entity: "Policy:1",
            details: JSON.stringify(payload.data)
        }
    });
    res.json(policy);
});
router.get("/users", async (_, res) => {
    const users = await prisma_1.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" }
    });
    res.json(users);
});
router.get("/audit", async (_, res) => {
    const logs = await prisma_1.prisma.auditLog.findMany({
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100
    });
    res.json(logs);
});
router.get("/metrics", async (_, res) => {
    const [userCount, catalogCount, activeLoanCount, reservationCount] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.catalogItem.count(),
        prisma_1.prisma.loan.count({ where: { status: "ACTIVE" } }),
        prisma_1.prisma.reservation.count()
    ]);
    const availability = await prisma_1.prisma.catalogItem.aggregate({
        _sum: {
            available: true,
            totalCopies: true
        }
    });
    const overdueCount = await prisma_1.prisma.loan.count({
        where: {
            status: "ACTIVE",
            dueDate: { lt: new Date() }
        }
    });
    res.json({
        users: userCount,
        catalogItems: catalogCount,
        activeLoans: activeLoanCount,
        overdueLoans: overdueCount,
        reservations: reservationCount,
        availableCopies: availability._sum.available ?? 0,
        totalCopies: availability._sum.totalCopies ?? 0
    });
});
exports.default = router;
