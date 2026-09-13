// admin/src/components/utils/printLetterhead.js
import logoUrl from "../../assets/logo.jpeg";
import { escapeHtml } from "./sanitize";

/**
 * Renders a document on the company letterhead and opens the print dialog.
 *
 * Uses a hidden iframe rather than window.open: a popup is blocked by default
 * in most browsers, and passing `noopener` in the features string makes
 * window.open return null while still opening the window — which is what left
 * an empty about:blank tab behind and printed a blank page.
 *
 * `title` is interpolated as text. `bodyHtml` is caller-controlled markup whose
 * data fields are already escaped by the API on read.
 */
export function printOnLetterhead({ title, bodyHtml }) {
  const safeTitle = escapeHtml(String(title || "Document"));

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { position: relative; font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0d0d0e; padding: 32px; margin: 0; }
      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); opacity: 0.06; width: 420px; pointer-events: none; z-index: 0; }
      .content { position: relative; z-index: 1; }
      .letterhead { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #eb2a2d; padding-bottom: 16px; margin-bottom: 24px; }
      .letterhead img { height: 48px; }
      .letterhead .name { font-size: 20px; font-weight: 700; }
      .letterhead .tagline { font-size: 11px; color: #595959; text-transform: uppercase; letter-spacing: 0.05em; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e6e7e8; font-size: 13px; }
      th { color: #595959; text-transform: uppercase; font-size: 11px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
      .label { color: #595959; }
      .total { font-size: 16px; font-weight: 700; border-top: 2px solid #0d0d0e; padding-top: 10px; margin-top: 10px; }
      .footer { margin-top: 40px; font-size: 11px; color: #98999b; text-align: center; }
      @page { margin: 12mm; }
    </style>
  </head>
  <body>
    <img class="watermark" src="${logoUrl}" alt="" />
    <div class="content">
      <div class="letterhead">
        <img src="${logoUrl}" alt="Conveyor Group" />
        <div>
          <div class="name">Conveyor Group Restaurant</div>
          <div class="tagline">Corporate Cashless Cafeteria &amp; QR Meal Management</div>
        </div>
      </div>
      ${bodyHtml}
      <div class="footer">This is a system-generated document — Conveyor Group Restaurant CCCMS</div>
    </div>
  </body>
</html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  // Off-screen rather than display:none — a hidden frame renders nothing, so
  // the print job would come out blank.
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  let cleanupTimer;

  function cleanup() {
    clearTimeout(cleanupTimer);
    // Deferred: removing the frame while the print dialog is still open
    // cancels the job in Safari.
    cleanupTimer = setTimeout(() => frame.remove(), 1000);
  }

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }

    // Waiting on the logo matters: printing before it decodes leaves a broken
    // image box on the letterhead.
    const done = () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* the dialog was dismissed — nothing to recover */
      } finally {
        cleanup();
      }
    };

    const images = Array.from(win.document.images);
    const pending = images.filter((img) => !img.complete);

    if (pending.length === 0) {
      done();
      return;
    }

    let remaining = pending.length;
    const settle = () => {
      remaining -= 1;
      if (remaining <= 0) done();
    };

    pending.forEach((img) => {
      img.addEventListener("load", settle, { once: true });
      img.addEventListener("error", settle, { once: true });
    });

    // Never hang on an image that resolves neither way.
    setTimeout(() => {
      if (remaining > 0) {
        remaining = 0;
        done();
      }
    }, 3000);
  };

  frame.srcdoc = html;
  document.body.appendChild(frame);
}