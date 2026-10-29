// admin/src/pages/modules/super-admin/pages/SelfOrderQr.jsx
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, FileDown, Printer, QrCode, Link2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { downloadImageAsA4Pdf, triggerDownload } from "../../../../components/utils/exportNode";
import { stationUrl } from "../../../../components/utils/stationCode";
import MealQr, { qrLogo } from "../../../../components/shared/MealQr";
import Loader from "../../../../components/shared/Loader";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const POSTER_W = 1240; // A4 at 150 dpi
const POSTER_H = 1754;
const QR_PX = 880;
const LOGO_RATIO = 0.22;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the logo."));
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The station QR as a printable A4 poster. Same link as the Home page, so a
 * phone camera opens the self-order page directly.
 */
export default function SelfOrderQr() {
  const { push } = useToast();
  const qrRef = useRef(null);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    dataStore
      .load("settings", "settings.json")
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  if (!settings) return <Loader full label="Loading..." />;

  const code = settings.selfOrderStationCode;
  const url = code ? stationUrl(code) : "";
  const restaurant = settings.restaurantName || "Conveyor Group Restaurant";

  async function buildPoster() {
    const qrCanvas = qrRef.current?.querySelector("canvas");
    if (!qrCanvas) throw new Error("QR is not ready yet.");
    const logoImg = await loadImage(qrLogo);

    const canvas = document.createElement("canvas");
    canvas.width = POSTER_W;
    canvas.height = POSTER_H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
    ctx.fillStyle = "#c81e1e";
    ctx.fillRect(0, 0, POSTER_W, 28);
    ctx.fillRect(0, POSTER_H - 28, POSTER_W, 28);

    // Header logo
    const headLogo = 120;
    ctx.drawImage(logoImg, (POSTER_W - headLogo) / 2, 90, headLogo, headLogo);

    ctx.textAlign = "center";
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "800 84px Inter, Arial, sans-serif";
    ctx.fillText("Self-Order Station", POSTER_W / 2, 320);
    ctx.fillStyle = "#525252";
    ctx.font = "500 38px Inter, Arial, sans-serif";
    ctx.fillText("Scan with your phone camera to get today's meal", POSTER_W / 2, 390);

    // QR
    const qrX = (POSTER_W - QR_PX) / 2;
    const qrY = 470;
    ctx.drawImage(qrCanvas, qrX, qrY, QR_PX, QR_PX);

    // Logo badge in the middle, drawn at full poster resolution
    const box = Math.round(QR_PX * LOGO_RATIO);
    const bx = qrX + (QR_PX - box) / 2;
    const by = qrY + (QR_PX - box) / 2;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, bx, by, box, box, box * 0.18);
    ctx.fill();
    const pad = box * 0.1;
    ctx.drawImage(logoImg, bx + pad, by + pad, box - pad * 2, box - pad * 2);

    // Steps
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 40px Inter, Arial, sans-serif";
    ctx.fillText("1. Scan    2. Sign in    3. Tap Get my meal", POSTER_W / 2, qrY + QR_PX + 110);
    ctx.fillStyle = "#737373";
    ctx.font = "500 32px Inter, Arial, sans-serif";
    ctx.fillText(restaurant, POSTER_W / 2, POSTER_H - 80);

    return canvas.toDataURL("image/png");
  }

  async function run(kind) {
    if (!code) return push("Set the station code in Settings first.", "error");
    setBusy(kind);
    try {
      const dataUrl = await buildPoster();
      if (kind === "png") triggerDownload(dataUrl, "self-order-qr.png");
      else if (kind === "pdf") downloadImageAsA4Pdf(dataUrl, POSTER_W, POSTER_H, "self-order-qr");
      else
        printOnLetterhead({
          title: "Self-Order QR",
          bodyHtml: `<div style="text-align:center"><img src="${dataUrl}" alt="Self-Order QR" style="max-width:100%;max-height:250mm"/></div>`,
        });
    } catch (err) {
      push(err?.message || "Could not make the poster.", "error");
    } finally {
      setBusy("");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      push("Link copied.", "success");
    } catch {
      push("Could not copy. Long press the link to copy it.", "error");
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 sm:text-2xl">
          <QrCode size={22} className="shrink-0 text-brand-600" /> Self-Order QR
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Put this at the counter. Employees scan it with their phone camera,
          sign in and get their meal. Download it as an image or PDF, or print it.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          {code ? (
            <MealQr value={url} size={320} fluid />
          ) : (
            <p className="py-16 text-center text-sm text-ink-400">
              No station code yet. Set it in Settings.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ActionBtn onClick={() => run("png")} Icon={Download} label={busy === "png" ? "Saving..." : "Download image"} disabled={!!busy || !code} />
            <ActionBtn onClick={() => run("pdf")} Icon={FileDown} label={busy === "pdf" ? "Saving..." : "Download PDF"} disabled={!!busy || !code} />
            <ActionBtn onClick={() => run("print")} Icon={Printer} label="Print" disabled={!!busy || !code} />
          </div>

          {code && (
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-left text-xs text-ink-600 transition hover:bg-ink-50"
            >
              <Link2 size={14} className="shrink-0 text-ink-400" />
              <span className="min-w-0 truncate">{url}</span>
            </button>
          )}

          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
            If you change the station code in Settings, this QR changes too.
            Print the new one and take the old poster down.
          </p>
        </div>
      </div>

      {/* Hidden high resolution QR used to draw the poster */}
      <div ref={qrRef} aria-hidden="true" style={{ position: "absolute", left: -10000, top: 0 }}>
        {code && (
          <QRCodeCanvas
            value={url}
            size={QR_PX}
            level="H"
            marginSize={2}
            imageSettings={{ src: BLANK, width: QR_PX * LOGO_RATIO, height: QR_PX * LOGO_RATIO, excavate: true }}
          />
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, Icon, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
    >
      <Icon size={16} /> {label}
    </button>
  );
}