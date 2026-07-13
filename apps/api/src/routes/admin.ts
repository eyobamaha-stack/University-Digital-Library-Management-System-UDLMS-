import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, RequestWithUser } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

router.use(requireAuth, requireRole([Role.ADMIN]));

router.get("/policy", async (_, res) => {
  const policy = await prisma.policy.findUnique({ where: { id: 1 } });
  res.json(policy);
});

router.put("/policy", async (req: RequestWithUser, res) => {
  const payload = z
    .object({
      loanDays: z.number().int().min(1).max(60),
      maxRenewals: z.number().int().min(0).max(10),
      finePerDayCents: z.number().int().min(0).max(1000),
      holdDays: z.number().int().min(1).max(30)
    })
    .safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const policy = await prisma.policy.upsert({
    where: { id: 1 },
    update: payload.data,
    create: { id: 1, ...payload.data }
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "POLICY_UPDATED",
      entity: "Policy:1",
      details: JSON.stringify(payload.data)
    }
  });

  res.json(policy);
});

router.get("/users", async (_, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(users);
});

router.get("/audit", async (_, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json(logs);
});

router.get("/metrics", async (_, res) => {
  const [userCount, catalogCount, activeLoanCount, reservationCount] = await Promise.all([
    prisma.user.count(),
    prisma.catalogItem.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.reservation.count()
  ]);

  const availability = await prisma.catalogItem.aggregate({
    _sum: {
      available: true,
      totalCopies: true
    }
  });

  const overdueCount = await prisma.loan.count({
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

export default router;
