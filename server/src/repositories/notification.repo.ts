// backend/src/repositories/notification.repo.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notificationReads, notifications } from "../db/schema.js";

export const notificationRepo = {
  // Targeting is by user_id, not name — two same-named employees can no longer
  // read each other's notifications (the old NotificationContext bug).
  forUser: (userId: string, role: string, limit = 50) =>
    db.select({
      id: notifications.id,
      event: notifications.event,
      message: notifications.message,
      createdAt: notifications.createdAt,
      read: sql<boolean>`${notificationReads.userId} IS NOT NULL`,
    })
      .from(notifications)
      .leftJoin(notificationReads,
        and(eq(notificationReads.notificationId, notifications.id), eq(notificationReads.userId, userId)))
      .where(sql`(${notifications.recipientUserIds} @> ARRAY[${userId}]::text[]
               OR ${notifications.recipientRoles}    @> ARRAY[${role}]::text[])`)
      .orderBy(desc(notifications.createdAt))
      .limit(limit),

  insert: (row: typeof notifications.$inferInsert) => db.insert(notifications).values(row).returning(),

  markRead: (notificationId: string, userId: string) =>
    db.insert(notificationReads).values({ notificationId, userId }).onConflictDoNothing(),

  markAllRead: (userId: string, role: string) =>
    db.execute(sql`
      INSERT INTO notification_reads (notification_id, user_id)
      SELECT n.id, ${userId} FROM notifications n
      WHERE n.recipient_user_ids @> ARRAY[${userId}]::text[]
         OR n.recipient_roles    @> ARRAY[${role}]::text[]
      ON CONFLICT DO NOTHING
    `),
};