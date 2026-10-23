// admin/src/components/shared/IdCard.jsx
import logo from "../../assets/logo.jpeg";
import MealQr from "./MealQr";

/**
 * The employee ID card, used on screen and in print from the same component.
 *
 * Printing is handled by the `print-card` class and the rules in index.css
 * rather than by rebuilding the card as an HTML string, so what comes out of
 * the printer cannot drift from what was on screen.
 */
export default function IdCard({ client, size = "normal" }) {
  if (!client) return null;

  const compact = size === "compact";

  // Falls back to the initials when there is no photo, so a card is never
  // printed with an empty hole where the face should be.
  const initials = (client.name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`print-card flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white ${
        compact ? "w-full" : "mx-auto w-full max-w-[380px]"
      }`}
      style={{ breakInside: "avoid" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b-[3px] border-brand-600 px-4 py-3">
        <img
          src={logo}
          alt=""
          className="h-9 w-9 shrink-0 rounded object-contain"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[12px] font-bold text-ink-900">
            Conveyor Group Restaurant
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-600">
            Employee Meal Card
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-3 px-4 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2.5">
            {client.photo ? (
              <img
                src={client.photo}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-ink-200 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-lg font-bold text-ink-500">
                {initials || "?"}
              </div>
            )}

            <div className="min-w-0 pt-0.5">
              <p className="truncate text-base font-bold leading-tight text-ink-900">
                {client.name}
              </p>
              <p className="truncate text-[11px] text-ink-500">
                {client.designation || "Employee"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <Row label="ID" value={client.employeeId} />
            <Row label="Dept" value={client.department || "—"} />
            <Row label="Issued" value={client.issuedOn || "—"} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center">
          <div className="rounded-lg border border-ink-200 p-1.5">
            <MealQr value={client.qrPayload || client.employeeId || ""} size={compact ? 76 : 92} />
          </div>
          <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-ink-400">
            Scan to collect
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-brand-600 px-4 py-1.5">
        <p className="text-[8px] font-semibold uppercase tracking-wider text-white">
          Property of Conveyor Group
        </p>
        {client.qrStatus === "expired" && (
          <p className="rounded bg-white px-1.5 text-[8px] font-bold uppercase tracking-wider text-brand-600">
            Expired
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
      <span className="w-12 shrink-0 text-ink-400">{label}</span>
      <span className="min-w-0 truncate font-semibold text-ink-900">{value}</span>
    </div>
  );
}