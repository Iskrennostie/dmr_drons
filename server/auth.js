import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();

export const passwordMatches = (candidate) => {
  if (!config.adminPassword) return false;
  return crypto.timingSafeEqual(digest(candidate), digest(config.adminPassword));
};

export const issueAdminToken = () => {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ role: "admin", sub: "mdr-owner" }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: "8h",
    issuer: "mdr-api",
    audience: "mdr-admin"
  });
};

export const requireAdmin = (request, response, next) => {
  try {
    if (!config.jwtSecret) return response.status(503).json({ ok: false, error: "Admin access is not configured." });
    const header = request.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    request.admin = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "mdr-api",
      audience: "mdr-admin"
    });
    return next();
  } catch {
    return response.status(401).json({ ok: false, error: "Требуется авторизация." });
  }
};
