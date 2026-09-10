// backend/src/lib/pagination.ts
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type Pagination = z.infer<typeof paginationSchema>;
export const offsetOf = (p: Pagination) => (p.page - 1) * p.pageSize;

export function paged<T>(items: T[], total: number, p: Pagination) {
  return { items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) };
}