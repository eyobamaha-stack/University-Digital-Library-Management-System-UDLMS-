import "dotenv/config";
import "express-async-errors";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import catalogRoutes from "./routes/catalog";
import loansRoutes from "./routes/loans";
import systemRoutes from "./routes/system";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "udlms-api", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/catalog", catalogRoutes);
app.use("/loans", loansRoutes);
app.use("/admin", adminRoutes);
app.use("/system", systemRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  if (typeof err === "object" && err !== null) {
    const maybeCode = "code" in err ? (err as { code?: string }).code : undefined;
    const maybeMessage = "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
    if (maybeCode === "P1001") {
      return res.status(503).json({ message: "Database unavailable. Please try again shortly." });
    }
    if (maybeMessage.includes("Can't reach database server")) {
      return res.status(503).json({ message: "Database unavailable. Please try again shortly." });
    }
  }

  return res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`UDLMS API running on http://localhost:${port}`);
});
