// admin/src/components/shared/CardDownloadButtons.jsx
import { useState } from "react";
import { Image as ImageIcon, FileDown, Maximize2, Printer } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { downloadNodePdf, downloadNodePng } from "../utils/exportNode";
import Modal from "./Modal";

/**
 * Large view, PNG, PDF and print for an ID card.
 * `targetRef` points at the card element; `renderCard` draws it again large.
 */
export default function CardDownloadButtons({ targetRef, fileName, renderCard, onPrint }) {
  const { push } = useToast();
  const [busy, setBusy] = useState("");
  const [large, setLarge] = useState(false);

  async function run(kind) {
    const node = targetRef?.current?.querySelector(".print-card") || targetRef?.current;
    if (!node) return;
    setBusy(kind);
    try {
      if (kind === "png") await downloadNodePng(node, fileName);
      else await downloadNodePdf(node, fileName, 100);
    } catch (err) {
      push(err?.message || "Could not save the card. Try again.", "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-[380px] grid-cols-2 gap-2 sm:grid-cols-4">
        <Btn onClick={() => setLarge(true)} Icon={Maximize2} label="View large" />
        <Btn onClick={() => run("png")} Icon={ImageIcon} label={busy === "png" ? "Saving..." : "Image"} disabled={!!busy} />
        <Btn onClick={() => run("pdf")} Icon={FileDown} label={busy === "pdf" ? "Saving..." : "PDF"} disabled={!!busy} />
        {onPrint && <Btn onClick={onPrint} Icon={Printer} label="Print" />}
      </div>

      <Modal open={large} onClose={() => setLarge(false)} title="ID Card" size="lg">
        {/* zoom scales text and QR together, so it stays sharp at any size */}
        <div className="flex w-full justify-center overflow-hidden py-2">
          <div style={{ zoom: "min(1.6, calc((100vw - 64px) / 380px))" }}>
            {renderCard?.()}
          </div>
        </div>
      </Modal>
    </>
  );
}

function Btn({ onClick, Icon, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
    >
      <Icon size={14} /> {label}
    </button>
  );
}