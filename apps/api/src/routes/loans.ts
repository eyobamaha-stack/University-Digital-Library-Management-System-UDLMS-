import { LoanStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, RequestWithUser } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

const borrowSchema = z.object({ itemId: z.number().int().positive() });
const reserveSchema = z.object({ itemId: z.number().int().positive() });

router.get("/me", requireAuth, async (req: RequestWithUser, res) => {
  const loans = await prisma.loan.findMany({
    where: { userId: req.user!.id },
    include: { item: true },
    orderBy: { checkedOut: "desc" }
  });

  const reservations = await prisma.reservation.findMany({
    where: { userId: req.user!.id },
    include: { item: true },
    orderBy: { createdAt: "desc" }
  });

  res.json({ loans, reservations });
});

router.post("/borrow", requireAuth, async (req: RequestWithUser, res) => {
  const result = borrowSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const policy = await prisma.policy.findUnique({ where: { id: 1 } });
  const loanDays = policy?.loanDays ?? 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDays);

  const item = await prisma.catalogItem.findUnique({ where: { id: result.data.itemId } });
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }
  if (item.available < 1) {
    return res.status(400).json({ message: "No available copies" });
  }

  const loan = await prisma.$transaction(async (tx) => {
    await tx.catalogItem.update({ where: { id: item.id }, data: { available: item.available - 1 } });
    return tx.loan.create({
      data: {
        userId: req.user!.id,
        itemId: item.id,
        dueDate,
        status: LoanStatus.ACTIVE
      },
      include: { item: true }
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "LOAN_CREATED",
      entity: `Loan:${loan.id}`,
      details: `Borrowed item ${item.title}`
    }
  });

  res.status(201).json(loan);
});

router.post("/reserve", requireAuth, async (req: RequestWithUser, res) => {
  const result = reserveSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const item = await prisma.catalogItem.findUnique({ where: { id: result.data.itemId } });
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const count = await prisma.reservation.count({ where: { itemId: item.id } });
  const reservation = await prisma.reservation.create({
    data: {
      userId: req.user!.id,
      itemId: item.id,
      queueOrder: count + 1
    },
    include: { item: true }
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "RESERVATION_CREATED",
      entity: `Reservation:${reservation.id}`,
      details: `Reserved item ${item.title}`
    }
  });

  res.status(201).json(reservation);
});

router.post("/:id/renew", requireAuth, async (req: RequestWithUser, res) => {
  const loanId = Number(req.params.id);
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.userId !== req.user!.id) {
    return res.status(404).json({ message: "Loan not found" });
  }

  const policy = await prisma.policy.findUnique({ where: { id: 1 } });
  const maxRenewals = policy?.maxRenewals ?? 2;
  const loanDays = policy?.loanDays ?? 14;

  if (loan.renewed >= maxRenewals) {
    return res.status(400).json({ message: "Renewal limit reached" });
  }

  const nextDueDate = new Date(loan.dueDate);
  nextDueDate.setDate(nextDueDate.getDate() + loanDays);

  const updated = await prisma.loan.update({
    where: { id: loan.id },
    data: {
      renewed: loan.renewed + 1,
      dueDate: nextDueDate
    },
    include: { item: true }
  });

  res.json(updated);
});

router.post("/:id/return", requireAuth, async (req: RequestWithUser, res) => {
  const loanId = Number(req.params.id);
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { item: true } });
  if (!loan) {
    return res.status(404).json({ message: "Loan not found" });
  }

  if (req.user!.role === Role.STUDENT && loan.userId !== req.user!.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const returnedLoan = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: LoanStatus.RETURNED,
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

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "LOAN_RETURNED",
      entity: `Loan:${loan.id}`,
      details: `Returned item ${loan.item.title}`
    }
  });

  res.json(updated);
});

router.post("/circulation/checkout", requireAuth, requireRole([Role.LIBRARIAN, Role.ADMIN]), async (req, res) => {
  const body = z.object({ userId: z.number().int(), itemId: z.number().int() }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const user = await prisma.user.findUnique({ where: { id: body.data.userId } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const item = await prisma.catalogItem.findUnique({ where: { id: body.data.itemId } });
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }
  if (item.available < 1) {
    return res.status(400).json({ message: "No available copies" });
  }

  const policy = await prisma.policy.findUnique({ where: { id: 1 } });
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (policy?.loanDays ?? 14));

  const loan = await prisma.$transaction(async (tx) => {
    await tx.catalogItem.update({ where: { id: item.id }, data: { available: item.available - 1 } });
    return tx.loan.create({
      data: {
        userId: user.id,
        itemId: item.id,
        dueDate,
        status: LoanStatus.ACTIVE
      },
      include: { item: true, user: true }
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: (req as RequestWithUser).user!.id,
      action: "CIRCULATION_CHECKOUT",
      entity: `Loan:${loan.id}`,
      details: `Checkout for user ${user.email} and item ${item.title}`
    }
  });

  return res.status(201).json(loan);
});

router.post("/circulation/checkin", requireAuth, requireRole([Role.LIBRARIAN, Role.ADMIN]), async (req, res) => {
  const body = z.object({ loanId: z.number().int() }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const loan = await prisma.loan.findUnique({ where: { id: body.data.loanId }, include: { item: true } });
  if (!loan) {
    return res.status(404).json({ message: "Loan not found" });
  }

  if (loan.status === LoanStatus.RETURNED) {
    return res.status(400).json({ message: "Loan already returned" });
  }

  const returned = await prisma.$transaction(async (tx) => {
    const updatedLoan = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: LoanStatus.RETURNED,
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

  await prisma.auditLog.create({
    data: {
      actorId: (req as RequestWithUser).user!.id,
      action: "CIRCULATION_CHECKIN",
      entity: `Loan:${loan.id}`,
      details: `Checkin for item ${loan.item.title}`
    }
  });

  return res.json(returned);
});

router.get("/circulation/active", requireAuth, requireRole([Role.LIBRARIAN, Role.ADMIN]), async (_req, res) => {
  const loans = await prisma.loan.findMany({
    where: { status: LoanStatus.ACTIVE },
    include: {
      user: { select: { id: true, name: true, email: true } },
      item: { select: { id: true, title: true, author: true, isbn: true } }
    },
    orderBy: { dueDate: "asc" },
    take: 100
  });

  res.json(loans);
});

export default router;
