// admin/src/pages/modules/manager/components/UsageHistory.jsx
import { useEffect, useState } from "react";
import { Lock, Printer } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import DateRangePicker, { useDateRange } from "../../../../components/shared/DateRangePicker";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";

const tk = (v) => `Tk ${Math.round(Number(v || 0)).toLocaleString()}`;
const dayLabel = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

/** What was used, day by day, for any day, month or year. Read only. */
export default function UsageHistory() {
  const range = useDateRange("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const days = data?.days ?? [];
  const { page, setPage, totalPages, pageItems } = usePagination(days, 7);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const { from, to } = range.range;

    apiGet(`/kitchen/consumption/range?from=${from}&to=${to}`)
      .then((d) => mounted && setData(d))
      .catch(() => mounted && setData(null))
      .finally(() => mounted && setLoading(false));

    setPage(1);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.range.from, range.range.to]);

  function print() {
    if (!days.length) return;
    printOnLetterhead({
      title: `Food Used, ${range.label}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Food Used</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${range.label}</p>
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Used</th><th>Rate</th><th>Cost</th></tr></thead>
          <tbody>
            ${days
              .flatMap((d) =>
                d.items.map(
                  (i, idx) =>
                    `<tr><td>${idx === 0 ? dayLabel(d.date) : ""}</td><td>${i.name}</td><td>${i.qty} ${i.unit}</td><td>Tk ${i.unitCost}</td><td>Tk ${i.cost}</td></tr>`,
                ),
              )
              .join("")}
          </tbody>
        </table>
        <div class="row total"><span>Total</span><span>Tk ${data.summary.totalCost}</span></div>
      `,
    });
  }

  return (
    <section className="w-full min-w-0 rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-700">Usage History</h2>
        <div className="flex items-center gap-2">
          {data?.summary?.totalCost > 0 && (
            <span className="text-sm font-bold text-brand-600">{tk(data.summary.totalCost)}</span>
          )}
          <button
            type="button"
            onClick={print}
            disabled={!days.length}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50 disabled:opacity-50"
          >
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      <DateRangePicker ctrl={range} className="mb-4" />

      {loading ? (
        <Loader label="Loading..." />
      ) : days.length === 0 ? (
        <p className="rounded-lg bg-ink-50 px-3 py-8 text-center text-sm text-ink-400">
          Nothing used in {range.label}.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((d) => (
              <div key={d.date} className="rounded-lg border border-ink-100">
                <div className="flex min-w-0 items-center justify-between gap-2 border-b border-ink-100 bg-ink-50 px-3 py-2">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink-800">
                    {dayLabel(d.date)}
                    {!d.editable && <Lock size={12} className="shrink-0 text-ink-300" aria-label="Locked" />}
                  </p>
                  <span className="shrink-0 text-sm font-bold text-ink-900">{tk(d.totalCost)}</span>
                </div>

                <div className="divide-y divide-ink-100">
                  {d.items.map((i) => (
                    <div key={i.id} className="flex min-w-0 items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-800">{i.name}</p>
                        <p className="text-xs text-ink-400">
                          {i.qty} {i.unit} x Tk {i.unitCost}
                          {i.note && `, ${i.note}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-ink-700">{tk(i.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-4" />
        </>
      )}
    </section>
  );
}