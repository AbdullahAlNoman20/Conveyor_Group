import { useEffect, useState } from "react";
import { Download, Printer, ShieldCheck, Utensils, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../../../components/hooks/useAuth";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";

export default function ClientQRCard() {
  const { user } = useAuth();
  const { push } = useToast();
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () =>
      setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  if (!clients) {
    return <Loader full label="Loading your QR card..." />;
  }

  const me = clients.find((c) => c.name === user?.name) || clients[0];

  const qrPayload = JSON.stringify({
    clientId: me?.id,
    employeeId: me?.employeeId,
    status: me?.qrStatus,
  });

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
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const employeeId = escapeXml(me?.employeeId || "N/A");
    const name = escapeXml(me?.name || "Employee");
    const department = escapeXml(me?.department || "N/A");
    const status = escapeXml(me?.qrStatus || "active");

    const cardSvg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        width="1050"
        height="600"
        viewBox="0 0 1050 600"
      >
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0e7673"/>
            <stop offset="100%" stop-color="#26937d"/>
          </linearGradient>

          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="18"
              flood-opacity="0.12"
            />
          </filter>
        </defs>

        <!-- Card -->
        <rect
          x="25"
          y="25"
          width="1000"
          height="550"
          rx="36"
          fill="#ffffff"
          stroke="#e5e7eb"
          stroke-width="2"
          filter="url(#shadow)"
        />

        <!-- Brand Header -->
        <rect
          x="25"
          y="25"
          width="1000"
          height="125"
          rx="36"
          fill="url(#brandGradient)"
        />

        <rect
          x="25"
          y="110"
          width="1000"
          height="40"
          fill="url(#brandGradient)"
        />

        <!-- Logo -->
        <circle
          cx="92"
          cy="87"
          r="38"
          fill="#ffffff"
          fill-opacity="0.16"
        />

        <text
          x="92"
          y="99"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="30"
          font-weight="800"
          fill="#ffffff"
        >
          CG
        </text>

        <!-- Company -->
        <text
          x="150"
          y="78"
          font-family="Arial, sans-serif"
          font-size="24"
          font-weight="800"
          fill="#ffffff"
        >
          CONVEYOR GROUP RESTAURANT
        </text>

        <text
          x="150"
          y="108"
          font-family="Arial, sans-serif"
          font-size="13"
          font-weight="600"
          letter-spacing="2"
          fill="#d9fffa"
        >
          EMPLOYEE MEAL MANAGEMENT SYSTEM
        </text>

        <!-- Card Type -->
        <text
          x="970"
          y="90"
          text-anchor="end"
          font-family="Arial, sans-serif"
          font-size="14"
          font-weight="800"
          letter-spacing="2"
          fill="#ffffff"
        >
          EMPLOYEE QR CARD
        </text>

        <!-- Left Content -->
        <text
          x="75"
          y="215"
          font-family="Arial, sans-serif"
          font-size="13"
          font-weight="700"
          letter-spacing="2"
          fill="#6b7280"
        >
          CARD HOLDER
        </text>

        <text
          x="75"
          y="258"
          font-family="Arial, sans-serif"
          font-size="34"
          font-weight="800"
          fill="#111827"
        >
          ${name}
        </text>

        <text
          x="75"
          y="294"
          font-family="Arial, sans-serif"
          font-size="16"
          font-weight="600"
          fill="#0e7673"
        >
          ${employeeId}
        </text>

        <!-- Divider -->
        <line
          x1="75"
          y1="325"
          x2="550"
          y2="325"
          stroke="#e5e7eb"
          stroke-width="2"
        />

        <!-- Info -->
        <text
          x="75"
          y="365"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="700"
          fill="#9ca3af"
        >
          DEPARTMENT
        </text>

        <text
          x="75"
          y="390"
          font-family="Arial, sans-serif"
          font-size="16"
          font-weight="700"
          fill="#374151"
        >
          ${department}
        </text>

        <text
          x="300"
          y="365"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="700"
          fill="#9ca3af"
        >
          STATUS
        </text>

        <text
          x="300"
          y="390"
          font-family="Arial, sans-serif"
          font-size="16"
          font-weight="700"
          fill="#0e7673"
        >
          ${status}
        </text>

        <!-- Usage -->
        <text
          x="75"
          y="440"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="700"
          fill="#9ca3af"
        >
          CARD PURPOSE
        </text>

        <text
          x="75"
          y="465"
          font-family="Arial, sans-serif"
          font-size="15"
          font-weight="600"
          fill="#374151"
        >
          Meal verification &amp; employee identification
        </text>

        <text
          x="75"
          y="492"
          font-family="Arial, sans-serif"
          font-size="13"
          fill="#6b7280"
        >
          Use this card at the restaurant counter
        </text>

        <!-- QR White Box -->
        <rect
          x="680"
          y="185"
          width="280"
          height="280"
          rx="26"
          fill="#ffffff"
          stroke="#e5e7eb"
          stroke-width="2"
        />

        <g transform="translate(730, 235)">
          ${qrMarkup}
        </g>

        <!-- QR Label -->
        <text
          x="820"
          y="495"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="700"
          letter-spacing="1.5"
          fill="#6b7280"
        >
          SCAN TO VERIFY
        </text>

        <!-- Footer -->
        <text
          x="970"
          y="535"
          text-anchor="end"
          font-family="Arial, sans-serif"
          font-size="11"
          font-weight="600"
          fill="#9ca3af"
        >
          Issued: 2026-01-05
        </text>
      </svg>
    `;

    const blob = new Blob([cardSvg], {
      type: "image/svg+xml",
    });

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

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            #employee-qr-print-card,
            #employee-qr-print-card * {
              visibility: visible !important;
            }

            #employee-qr-print-card {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            #employee-qr-print-card .print-actions {
              display: none !important;
            }

            @page {
              size: auto;
              margin: 12mm;
            }
          }
        `}
      </style>

      <div
        id="employee-qr-print-card"
        className="mx-auto max-w-4xl px-4 py-6 sm:px-6"
      >
        {/* Page Heading */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              Employee Access
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              My QR Card
            </h1>

            <p className="mt-1 text-sm text-ink-400">
              Your digital meal verification and identification card.
            </p>
          </div>
        </div>

        {/* VISITING CARD */}
        <div className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-xl">
          {/* Top Brand Area */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-7 text-white sm:px-9">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between gap-4">
              {/* Company */}
              <div className="flex items-center gap-3">
                {/* Company Logo */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-lg font-black text-white backdrop-blur-sm">
                  CG
                </div>

                <div>
                  <p className="text-sm font-extrabold tracking-wide">
                    CONVEYOR GROUP RESTAURANT
                  </p>

                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Employee Meal Management System
                  </p>
                </div>
              </div>

              {/* Card Type */}
              <div className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm sm:block">
                Employee QR Card
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="grid md:grid-cols-[1fr_290px]">
            {/* Information */}
            <div className="p-6 sm:p-9">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
                <UserRound size={14} className="text-brand-600" />
                Card Holder
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-ink-900">
                {me?.name}
              </h2>

              <p className="mt-1 text-base font-bold text-brand-600">
                {me?.employeeId}
              </p>

              <div className="my-6 h-px bg-ink-100" />

              {/* Details */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Department
                  </p>

                  <p className="mt-1.5 text-sm font-bold text-ink-800">
                    {me?.department || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Status
                  </p>

                  <div className="mt-1.5">
                    <Badge
                      tone={
                        me?.qrStatus === "active" ? "active" : "expired"
                      }
                    >
                      {me?.qrStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={17}
                      className="text-brand-600"
                    />

                    <p className="text-xs font-bold text-ink-800">
                      What is this?
                    </p>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-ink-500">
                    Your employee identification and meal verification
                    card.
                  </p>
                </div>

                <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <Utensils
                      size={17}
                      className="text-brand-600"
                    />

                    <p className="text-xs font-bold text-ink-800">
                      Where to use?
                    </p>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-ink-500">
                    Show or scan this card at the restaurant counter for
                    meal verification.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                  Issue Date
                </p>

                <p className="text-xs font-bold text-ink-700">
                  2026-01-05
                </p>
              </div>
            </div>

            {/* QR Area */}
            <div className="flex flex-col items-center justify-center border-t border-ink-100 bg-ink-50/40 p-6 md:border-l md:border-t-0 sm:p-8">
              <div className="rounded-[24px] border border-ink-100 bg-white p-5 shadow-sm">
                <QRCodeSVG
                  id="client-qr-svg"
                  value={qrPayload}
                  size={190}
                  level="M"
                />
              </div>

              <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.18em] text-ink-500">
                Scan to Verify
              </p>

              <p className="mt-1 max-w-[210px] text-center text-[11px] leading-5 text-ink-400">
                Present this QR code at the restaurant counter for
                employee and meal verification.
              </p>
            </div>
          </div>

          {/* Bottom Accent */}
          <div className="h-1.5 bg-brand-600" />
        </div>

        {/* Actions */}
        <div className="print-actions mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleDownload}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:border-brand-300 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-brand-500/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
            />

            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] scale-x-0 bg-brand-600 opacity-70 transition-transform duration-200 ease-out group-hover:scale-x-100"
            />

            <span className="relative z-10 flex items-center gap-2">
              <Download size={16} />
              Download Card
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
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
              <Printer size={16} />
              Print Card
            </span>
          </button>
        </div>
      </div>
    </>
  );
}