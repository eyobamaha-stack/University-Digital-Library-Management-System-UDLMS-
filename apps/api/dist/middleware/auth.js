"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_1 = require("../services/auth");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing bearer token" });
    }
    try {
        const token = authHeader.slice(7);
        req.user = (0, auth_1.verifyToken)(token);
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
function requireRole(allowed) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
}
