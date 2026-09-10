// backend/src/routes/index.ts
import type { FastifyInstance } from "fastify";
import healthRoutes from "./health.route.js";
import authRoutes from "./auth.route.js";
import publicRoutes from "./public.route.js";
import clientRoutes from "./client.route.js";
import staffRoutes from "./staff.route.js";
import menuRoutes from "./menu.route.js";
import orderRoutes from "./order.route.js";
import qrRoutes from "./qr.route.js";
import notificationRoutes from "./notification.route.js";
import accountRequestRoutes from "./accountRequest.route.js";
import reportRoutes from "./report.route.js";
import settingsRoutes from "./settings.route.js";
import uploadRoutes from "./upload.route.js";
import backupRoutes from "./backup.route.js";

export default async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);

  await app.register(async (v1) => {
    await v1.register(authRoutes, { prefix: "/auth" });
    await v1.register(publicRoutes, { prefix: "/public" });
    await v1.register(clientRoutes, { prefix: "/clients" });
    await v1.register(staffRoutes, { prefix: "/staff" });
    await v1.register(menuRoutes, { prefix: "/menu" });
    await v1.register(orderRoutes, { prefix: "/orders" });
    await v1.register(qrRoutes, { prefix: "/qr" });
    await v1.register(notificationRoutes, { prefix: "/notifications" });
    await v1.register(accountRequestRoutes, { prefix: "/account-requests" });
    await v1.register(reportRoutes, { prefix: "/reports" });
    await v1.register(settingsRoutes, { prefix: "/settings" });
    await v1.register(uploadRoutes, { prefix: "/uploads" });
    await v1.register(backupRoutes, { prefix: "/backup" });
  }, { prefix: "/api/v1" });
}