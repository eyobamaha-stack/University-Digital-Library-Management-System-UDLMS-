import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

const itemSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(5),
  subject: z.string().min(1),
  resourceType: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  totalCopies: z.number().int().min(1),
  available: z.number().int().min(0)
});

router.get("/", requireAuth, async (req, res) => {
  const query = String(req.query.q || "").trim();
  const type = String(req.query.type || "all").toLowerCase();

  const items = await prisma.catalogItem.findMany({
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

router.post("/", requireAuth, requireRole([Role.LIBRARIAN, Role.ADMIN]), async (req, res) => {
  const result = itemSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
  }

  const payload = result.data;
  const item = await prisma.catalogItem.create({ data: payload });
  res.status(201).json(item);
});

router.put("/:id", requireAuth, requireRole([Role.LIBRARIAN, Role.ADMIN]), async (req, res) => {
  const id = Number(req.params.id);
  const result = itemSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid payload", errors: result.error.flatten() });
  }

  const updated = await prisma.catalogItem.update({
    where: { id },
    data: result.data
  });

  res.json(updated);
});

router.get("/stats/summary", requireAuth, async (_req, res) => {
  const [items, totals] = await Promise.all([
    prisma.catalogItem.count(),
    prisma.catalogItem.aggregate({ _sum: { available: true, totalCopies: true } })
  ]);

  res.json({
    itemCount: items,
    availableCopies: totals._sum.available ?? 0,
    totalCopies: totals._sum.totalCopies ?? 0
  });
});

export default router;
