// admin/src/components/shared/MealAttendanceCard.jsx
import { useEffect, useState } from "react";
import { CalendarCheck, CalendarX, AlertTriangle, Clock, XCircle } from "lucide-react";
import { apiPost } from "../services/api";
import { useToast } from "../hooks/useToast";

/**
 * Today's meal is opt-OUT: everyone is scheduled unless they cancel before the
 * cutoff. Missing the cutoff without collecting still bills the meal, so the
 * countdown is the most important thing on this card.
 */
const STYLES = {
  pending: {
    Icon: CalendarCheck,
    tone: "border-brand-200 bg-brand-50",
    accent: "text-brand-600",
    title: "You're scheduled for today's meal",
  },
  cancelled: {
    Icon: CalendarX,
    tone: "border-ink-200 bg-ink-50",
    accent: "text-ink-500",
    title: "You cancelled today's meal",
  },
  collected: {
    Icon: CalendarCheck,
    tone: "border-emerald-200 bg-emerald-50",
    accent: "text-emerald-600",
    title: "Today's meal collected",
  },
  no_show: {
    Icon: AlertTriangle,
    tone: "border-amber-200 bg-amber-50",
    accent: "text-amber-600",
    title: "Missed without cancelling",
  },
};

function formatCountdown(minutes) {
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m left to cancel`;
  return `${m}m left to cancel`;
}

export default function MealAttendanceCard({ attendance, onChange }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(attendance?.minutesUntilCutoff ?? 0);

  // Ticks locally so the deadline stays honest without polling the API.
  useEffect(() => {
    setMinutesLeft(attendance?.minutesUntilCutoff ?? 0);
  }, [attendance?.minutesUntilCutoff]);

  useEffect(() => {
    if (minutesLeft <= 0) return undefined;
    const t = setInterval(() => setMinutesLeft((m) => Math.max(0, m - 1)), 60_000);
    return () => clearInterval(t);
  }, [minutesLeft]);

  if (!attendance) return null;

  const style = STYLES[attendance.status] ?? STYLES.pending;
  const countdown = formatCountdown(minutesLeft);
  const canCancel = attendance.status === "pending" && minutesLeft > 0;

  async function cancel() {
    setBusy(true);
    try {
      const next = await apiPost("/attendance/me/cancel");
      push("Today's meal cancelled — you won't be charged.", "success");
      setConfirming(false);
      onChange?.(next);
    } catch (err) {
      push(err?.message || "Couldn't cancel today's meal.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${style.tone}`}>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <style.Icon size={22} className={`mt-0.5 shrink-0 ${style.accent}`} />

          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900">{style.title}</p>

            {attendance.mealName && (
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {attendance.mealName} · Tk {attendance.mealPrice}
              </p>
            )}

            {attendance.status === "pending" && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ink-500">
                <Clock size={12} className="shrink-0" />
                {countdown ?? `Cancellations closed at ${attendance.cutoffLabel}`}
              </p>
            )}

            {attendance.status === "cancelled" && (
              <p className="mt-1 text-xs text-ink-500">
                Nothing will be deducted for today.
              </p>
            )}

            {attendance.status === "no_show" && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Tk {attendance.amountCharged} was deducted — the meal was
                prepared but not collected.
              </p>
            )}

            {attendance.status === "collected" && (
              <p className="mt-1 text-xs text-ink-500">
                Tk {attendance.amountCharged} added to your statement.
              </p>
            )}
          </div>
        </div>

        {canCancel && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-600"
          >
            <XCircle size={14} />
            Cancel today's meal
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 rounded-lg border border-ink-200 bg-white p-3.5">
          <p className="text-xs leading-5 text-ink-600">
            Cancel today's meal? You won't be charged, but the kitchen won't
            prepare it either — you can't order again today.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="min-h-10 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="min-h-10 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Cancelling..." : "Yes, cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}