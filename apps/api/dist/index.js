"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("express-async-errors");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const admin_1 = __importDefault(require("./routes/admin"));
const auth_1 = __importDefault(require("./routes/auth"));
const catalog_1 = __importDefault(require("./routes/catalog"));
const loans_1 = __importDefault(require("./routes/loans"));
const system_1 = __importDefault(require("./routes/system"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 4000);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "udlms-api", timestamp: new Date().toISOString() });
});
app.use("/auth", auth_1.default);
app.use("/catalog", catalog_1.default);
app.use("/loans", loans_1.default);
app.use("/admin", admin_1.default);
app.use("/system", system_1.default);
app.use((err, _req, res, _next) => {
    console.error(err);
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({ message: "Invalid JSON payload" });
    }
    if (typeof err === "object" && err !== null) {
        const maybeCode = "code" in err ? err.code : undefined;
        const maybeMessage = "message" in err ? String(err.message ?? "") : "";
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
