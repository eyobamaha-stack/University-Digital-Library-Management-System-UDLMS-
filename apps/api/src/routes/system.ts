import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, RequestWithUser } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

router.post("/notifications/mock", requireAuth, requireRole([Role.LIBRARIAN, Role.ADMIN]), async (req: RequestWithUser, res) => {
  const payload = z
    .object({
      userId: z.number().int().positive(),
      channel: z.enum(["email", "sms"]),
      subject: z.string().min(2),
      message: z.string().min(2)
    })
    .safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
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

export default router;
