import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );
  return { page: safePage, setPage, totalPages, pageItems, pageSize };
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  className = "",
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 pt-3 ${className}`}
    >
      <p className="text-xs text-ink-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
