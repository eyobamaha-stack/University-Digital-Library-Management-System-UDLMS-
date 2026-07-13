"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
const itemSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    author: zod_1.z.string().min(1),
    isbn: zod_1.z.string().min(5),
    subject: zod_1.z.string().min(1),
    resourceType: zod_1.z.string().min(1),
    year: zod_1.z.number().int().min(1900).max(2100),
    totalCopies: zod_1.z.number().int().min(1),
    available: zod_1.z.number().int().min(0)
});
router.get("/", auth_1.requireAuth, async (req, res) => {
    const query = String(req.query.q || "").trim();
    const type = String(req.query.type || "all").toLowerCase();
    const items = await prisma_1.prisma.catalogItem.findMany({
        where: {
            AND: [
                type === "all" ? {} : { resourceType: { equals: type, mode: "insensitive" } },
                query
                    ? {
                        OR: [
                            { title: { contains: query, mode: "insensitive" } },
                            { author: { contains: query, mode: "insensitive" } },
                            { subject: { contains: query, mode: "insensitive" } },
                            { isbn: { contains: query, mode: "insensitive" } }
                        ]
                    }
                    : {}
            ]
        },
        orderBy: { title: "asc" }
    });
    res.json(items);
});
router.post("/", auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.LIBRARIAN, client_1.Role.ADMIN]), async (req, res) => {
    const result = itemSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
    }
    const payload = result.data;
    const item = await prisma_1.prisma.catalogItem.create({ data: payload });
    res.status(201).json(item);
});
router.put("/:id", auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.LIBRARIAN, client_1.Role.ADMIN]), async (req, res) => {
    const id = Number(req.params.id);
    const result = itemSchema.partial().safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
    }
    const updated = await prisma_1.prisma.catalogItem.update({
        where: { id },
        data: result.data
    });
    res.json(updated);
});
router.get("/stats/summary", auth_1.requireAuth, async (_req, res) => {
    const [items, totals] = await Promise.all([
        prisma_1.prisma.catalogItem.count(),
        prisma_1.prisma.catalogItem.aggregate({ _sum: { available: true, totalCopies: true } })
    ]);
    res.json({
        itemCount: items,
        availableCopies: totals._sum.available ?? 0,
        totalCopies: totals._sum.totalCopies ?? 0
    });
});
exports.default = router;
