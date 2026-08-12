// FILE: src/components/utils/printLetterhead.js  (NEW)
import logoUrl from "../../assets/logo.jpeg";

/** Opens a new window with the restaurant's letterhead (logo + name) above
 * whatever `bodyHtml` is passed, then triggers print. */
export function printOnLetterhead({ title, bodyHtml }) {
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) return;

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0d0d0e; padding: 32px; }
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
        </style>
      </head>
      <body>
        <div class="letterhead">
          <img src="${logoUrl}" alt="Conveyor Group" />
          <div>
            <div class="name">Conveyor Group Restaurant</div>
            <div class="tagline">Corporate Cashless Cafeteria & QR Meal Management</div>
          </div>
        </div>
        ${bodyHtml}
        <div class="footer">This is a system-generated document — Conveyor Group Restaurant CCCMS</div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}