// FILE: src/pages/modules/client/pages/ClientQRCard.jsx (MODIFIED — mobile-responsive fixes)
import { Download, ShieldCheck, Utensils, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";

export default function ClientQRCard() {
  const { user } = useAuth();
  const { push } = useToast();
  const clients = useLiveCollection("clients", "clients.json");

  if (!clients) return <Loader full label="Loading your QR card..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const qrPayload = JSON.stringify({ clientId: me?.id, employeeId: me?.employeeId, status: me?.qrStatus });

  function handleDownload() {
    const qrSvg = document.getElementById("client-qr-svg");
    if (!qrSvg) return;
    const serializer = new XMLSerializer();
    const qrSource = serializer.serializeToString(qrSvg);
    const parser = new DOMParser();
    const qrDocument = parser.parseFromString(qrSource, "image/svg+xml");
    const qrElement = qrDocument.documentElement;
    const qrMarkup = new XMLSerializer().serializeToString(qrElement);

    const escapeXml = (value = "") =>
      String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    const employeeId = escapeXml(me?.employeeId || "N/A");
    const name = escapeXml(me?.name || "Employee");
    const department = escapeXml(me?.department || "N/A");
    const status = escapeXml(me?.qrStatus || "active");

    const cardSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1050" height="600" viewBox="0 0 1050 600">
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0e7673"/>
            <stop offset="100%" stop-color="#26937d"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity="0.12" />
          </filter>
        </defs>
        <rect x="25" y="25" width="1000" height="550" rx="36" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" filter="url(#shadow)" />
        <rect x="25" y="25" width="1000" height="125" rx="36" fill="url(#brandGradient)" />
        <rect x="25" y="110" width="1000" height="40" fill="url(#brandGradient)" />
        <circle cx="92" cy="87" r="38" fill="#ffffff" fill-opacity="0.16" />
        <text x="92" y="99" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#ffffff">CG</text>
        <text x="150" y="78" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff">CONVEYOR GROUP RESTAURANT</text>
        <text x="150" y="108" font-family="Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="2" fill="#d9fffa">EMPLOYEE MEAL MANAGEMENT SYSTEM</text>
        <text x="970" y="90" text-anchor="end" font-family="Arial, sans-serif" font-size="14" font-weight="800" letter-spacing="2" fill="#ffffff">EMPLOYEE QR CARD</text>
        <text x="75" y="215" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#6b7280">CARD HOLDER</text>
        <text x="75" y="258" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#111827">${name}</text>
        <text x="75" y="294" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#0e7673">${employeeId}</text>
        <line x1="75" y1="325" x2="550" y2="325" stroke="#e5e7eb" stroke-width="2" />
        <text x="75" y="365" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#9ca3af">DEPARTMENT</text>
        <text x="75" y="390" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#374151">${department}</text>
        <text x="300" y="365" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#9ca3af">STATUS</text>
        <text x="300" y="390" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#0e7673">${status}</text>
        <text x="75" y="440" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#9ca3af">CARD PURPOSE</text>
        <text x="75" y="465" font-family="Arial, sans-serif" font-size="15" font-weight="600" fill="#374151">Meal verification &amp; employee identification</text>
        <text x="75" y="492" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Use this card at the restaurant counter</text>
        <rect x="680" y="185" width="280" height="280" rx="26" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" />
        <g transform="translate(730, 235)">${qrMarkup}</g>
        <text x="820" y="495" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#6b7280">SCAN TO VERIFY</text>
        <text x="970" y="535" text-anchor="end" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#9ca3af">Issued: 2026-01-05</text>
      </svg>
    `;

    const blob = new Blob([cardSvg], { type: "image/svg+xml" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${me?.employeeId || "employee-qr-card"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    push("QR card downloaded successfully.", "success");
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Page Heading */}
      <div className="mb-5 sm:mb-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 sm:text-xs">Employee Access</p>
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl md:text-3xl">My QR Card</h1>
        <p className="mt-1 text-xs text-ink-400 sm:text-sm">Your digital meal verification and identification card.</p>
      </div>

      {/* VISITING CARD — overflow-hidden keeps the gradient header's
          decorative circles from ever creating horizontal scroll on
          narrow screens */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl sm:rounded-[28px]">
        {/* Top Brand Area */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-5 text-white sm:px-9 sm:py-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/15 sm:h-12 sm:w-12 sm:rounded-xl">
                {me?.photo ? (
                  <img src={me.photo} alt={me.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-black text-white sm:text-lg">CG</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold tracking-wide sm:text-sm">CONVEYOR GROUP RESTAURANT</p>
                <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-[10px] sm:tracking-[0.18em]">
                  Employee Meal Management System
                </p>
              </div>
            </div>
            <div className="hidden shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm sm:block">
              Employee QR Card
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="grid md:grid-cols-[1fr_290px]">
          {/* Information */}
          <div className="p-4 sm:p-6 md:p-9">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400 sm:text-xs sm:tracking-[0.16em]">
              <UserRound size={13} className="text-brand-600" />
              Card Holder
            </div>

            <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-ink-900 sm:mt-3 sm:text-3xl">{me?.name}</h2>
            <p className="mt-1 text-sm font-bold text-brand-600 sm:text-base">{me?.employeeId}</p>

            <div className="my-5 h-px bg-ink-100 sm:my-6" />

            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-400 sm:text-[10px]">Department</p>
                <p className="mt-1.5 break-words text-sm font-bold text-ink-800">{me?.department || "N/A"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-400 sm:text-[10px]">Status</p>
                <div className="mt-1.5">
                  <Badge tone={me?.qrStatus === "active" ? "active" : "expired"}>{me?.qrStatus}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="shrink-0 text-brand-600" />
                  <p className="text-xs font-bold text-ink-800">What is this?</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-500">Your employee identification and meal verification card.</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <Utensils size={16} className="shrink-0 text-brand-600" />
                  <p className="text-xs font-bold text-ink-800">Where to use?</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-500">Show or scan this card at the restaurant counter for meal verification.</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 sm:mt-6">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-400 sm:text-[10px]">Issue Date</p>
              <p className="text-xs font-bold text-ink-700">2026-01-05</p>
            </div>
          </div>

          {/* QR Area — width now clamps to the viewport instead of a fixed
              size, so it never overflows a narrow phone screen */}
          <div className="flex flex-col items-center justify-center border-t border-ink-100 bg-ink-50/40 p-5 md:border-l md:border-t-0 sm:p-8">
            <div className="w-full max-w-[210px] rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:max-w-none sm:rounded-[24px] sm:p-5">
              <QRCodeSVG id="client-qr-svg" value={qrPayload} className="h-auto w-full" size={190} level="M" />
            </div>
            <p className="mt-4 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-ink-500 sm:tracking-[0.18em]">Scan to Verify</p>
            <p className="mt-1 max-w-[220px] text-center text-[11px] leading-5 text-ink-400">
              Present this QR code at the restaurant counter for employee and meal verification.
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-brand-600" />
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleDownload}
          className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:w-auto sm:py-2.5"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] scale-x-0 bg-current opacity-70 transition-transform duration-200 ease-out group-hover:scale-x-100"
          />
          <span className="relative z-10 flex items-center gap-2">
            <Download size={16} />
            Download Card
          </span>
        </button>
      </div>
    </div>
  );
}