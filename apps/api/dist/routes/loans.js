"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
const borrowSchema = zod_1.z.object({ itemId: zod_1.z.number().int().positive() });
const reserveSchema = zod_1.z.object({ itemId: zod_1.z.number().int().positive() });
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const loans = await prisma_1.prisma.loan.findMany({
        where: { userId: req.user.id },
        include: { item: true },
        orderBy: { checkedOut: "desc" }
    });
    const reservations = await prisma_1.prisma.reservation.findMany({
        where: { userId: req.user.id },
        include: { item: true },
        orderBy: { createdAt: "desc" }
    });
    res.json({ loans, reservations });
});
router.post("/borrow", auth_1.requireAuth, async (req, res) => {
    const result = borrowSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: 1 } });
    const loanDays = policy?.loanDays ?? 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    const item = await prisma_1.prisma.catalogItem.findUnique({ where: { id: result.data.itemId } });
    if (!item) {
        return res.status(404).json({ message: "Item not found" });
    }
    if (item.available < 1) {
        return res.status(400).json({ message: "No available copies" });
    }
    const loan = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.catalogItem.update({ where: { id: item.id }, data: { available: item.available - 1 } });
        return tx.loan.create({
            data: {
                userId: req.user.id,
                itemId: item.id,
                dueDate,
                status: client_1.LoanStatus.ACTIVE
            },
            include: { item: true }
        });
    });
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "LOAN_CREATED",
            entity: `Loan:${loan.id}`,
            details: `Borrowed item ${item.title}`
        }
    });
    res.status(201).json(loan);
});
router.post("/reserve", auth_1.requireAuth, async (req, res) => {
    const result = reserveSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    const item = await prisma_1.prisma.catalogItem.findUnique({ where: { id: result.data.itemId } });
    if (!item) {
        return res.status(404).json({ message: "Item not found" });
    }
    const count = await prisma_1.prisma.reservation.count({ where: { itemId: item.id } });
    const reservation = await prisma_1.prisma.reservation.create({
        data: {
            userId: req.user.id,
            itemId: item.id,
            queueOrder: count + 1
        },
        include: { item: true }
    });
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "RESERVATION_CREATED",
            entity: `Reservation:${reservation.id}`,
            details: `Reserved item ${item.title}`
        }
    });
    res.status(201).json(reservation);
});
router.post("/:id/renew", auth_1.requireAuth, async (req, res) => {
    const loanId = Number(req.params.id);
    const loan = await prisma_1.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== req.user.id) {
        return res.status(404).json({ message: "Loan not found" });
    }
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: 1 } });
    const maxRenewals = policy?.maxRenewals ?? 2;
    const loanDays = policy?.loanDays ?? 14;
    if (loan.renewed >= maxRenewals) {
        return res.status(400).json({ message: "Renewal limit reached" });
    }
    const nextDueDate = new Date(loan.dueDate);
    nextDueDate.setDate(nextDueDate.getDate() + loanDays);
    const updated = await prisma_1.prisma.loan.update({
        where: { id: loan.id },
        data: {
            renewed: loan.renewed + 1,
            dueDate: nextDueDate
        },
        include: { item: true }
    });
    res.json(updated);
});
router.post("/:id/return", auth_1.requireAuth, async (req, res) => {
    const loanId = Number(req.params.id);
    const loan = await prisma_1.prisma.loan.findUnique({ where: { id: loanId }, include: { item: true } });
    if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
    }
    if (req.user.role === client_1.Role.STUDENT && loan.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const returnedLoan = await tx.loan.update({
            where: { id: loan.id },
            data: {
                status: client_1.LoanStatus.RETURNED,
                returnedAt: new Date()
            },
            include: { item: true }
        });
        await tx.catalogItem.update({
            where: { id: loan.itemId },
            data: { available: loan.item.available + 1 }
        });
        return returnedLoan;
    });
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "LOAN_RETURNED",
            entity: `Loan:${loan.id}`,
            details: `Returned item ${loan.item.title}`
        }
    });
    res.json(updated);
});
router.post("/circulation/checkout", auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.LIBRARIAN, client_1.Role.ADMIN]), async (req, res) => {
    const body = zod_1.z.object({ userId: zod_1.z.number().int(), itemId: zod_1.z.number().int() }).safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: body.data.userId } });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const item = await prisma_1.prisma.catalogItem.findUnique({ where: { id: body.data.itemId } });
    if (!item) {
        return res.status(404).json({ message: "Item not found" });
    }
    if (item.available < 1) {
        return res.status(400).json({ message: "No available copies" });
    }
    const policy = await prisma_1.prisma.policy.findUnique({ where: { id: 1 } });
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (policy?.loanDays ?? 14));
    const loan = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.catalogItem.update({ where: { id: item.id }, data: { available: item.available - 1 } });
        return tx.loan.create({
            data: {
                userId: user.id,
                itemId: item.id,
                dueDate,
                status: client_1.LoanStatus.ACTIVE
            },
            include: { item: true, user: true }
        });
    });
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "CIRCULATION_CHECKOUT",
            entity: `Loan:${loan.id}`,
            details: `Checkout for user ${user.email} and item ${item.title}`
        }
    });
    return res.status(201).json(loan);
});
router.post("/circulation/checkin", auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.LIBRARIAN, client_1.Role.ADMIN]), async (req, res) => {
    const body = zod_1.z.object({ loanId: zod_1.z.number().int() }).safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    const loan = await prisma_1.prisma.loan.findUnique({ where: { id: body.data.loanId }, include: { item: true } });
    if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
    }
    if (loan.status === client_1.LoanStatus.RETURNED) {
        return res.status(400).json({ message: "Loan already returned" });
    }
    const returned = await prisma_1.prisma.$transaction(async (tx) => {
        const updatedLoan = await tx.loan.update({
            where: { id: loan.id },
            data: {
                status: client_1.LoanStatus.RETURNED,
                returnedAt: new Date()
            },
            include: { item: true, user: true }
        });
        await tx.catalogItem.update({
            where: { id: loan.itemId },
            data: { available: loan.item.available + 1 }
        });
        return updatedLoan;
    });
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId: req.user.id,
            action: "CIRCULATION_CHECKIN",
            entity: `Loan:${loan.id}`,
            details: `Checkin for item ${loan.item.title}`
        }
    });
    return res.json(returned);
});
router.get("/circulation/active", auth_1.requireAuth, (0, auth_1.requireRole)([client_1.Role.LIBRARIAN, client_1.Role.ADMIN]), async (_req, res) => {
    const loans = await prisma_1.prisma.loan.findMany({
        where: { status: client_1.LoanStatus.ACTIVE },
        include: {
            user: { select: { id: true, name: true, email: true } },
            item: { select: { id: true, title: true, author: true, isbn: true } }
        },
        orderBy: { dueDate: "asc" },
        take: 100
    });
    res.json(loans);
});
exports.default = router;
