// admin/src/components/utils/exportNode.js
import { domToCanvas } from "modern-screenshot";
import { jsPDF } from "jspdf";

const safeName = (name) =>
  String(name || "file").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").slice(0, 80);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function triggerDownload(href, fileName) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Waits until every picture and font inside the node is really ready.
 * Taking the snapshot before that is what produced the blank image.
 */
async function settle(node) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (!img.complete) {
          await new Promise((res) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          });
        }
        if (img.decode) await img.decode().catch(() => undefined);
      } catch {
        /* a broken photo should not stop the download */
      }
    }),
  );
  if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
}

/** True when the canvas is (almost) all white, i.e. the snapshot failed. */
function isBlank(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  if (!ctx || !width || !height) return true;

  const step = Math.max(4, Math.floor(Math.min(width, height) / 60));
  const { data } = ctx.getImageData(0, 0, width, height);
  let dark = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) dark += 1;
      if (dark > 20) return false;
    }
  }
  return true;
}

/** Renders a DOM node to a sharp canvas. Retries once if it comes out blank. */
export async function nodeToCanvas(node, scale = 4) {
  if (!node) throw new Error("Nothing to save.");
  await settle(node);

  const opts = {
    scale,
    backgroundColor: "#ffffff",
    // Photos come from storage on another domain.
    fetch: { requestInit: { mode: "cors", cache: "no-cache" } },
    timeout: 15000,
  };

  let canvas = await domToCanvas(node, opts);
  if (isBlank(canvas)) {
    // First pass warms the image cache in some browsers; the second one draws.
    await wait(300);
    canvas = await domToCanvas(node, opts);
  }
  if (isBlank(canvas)) {
    throw new Error("Could not draw the card. Use Print and choose Save as PDF.");
  }
  return canvas;
}

export async function nodeToPng(node, scale = 4) {
  const canvas = await nodeToCanvas(node, scale);
  return canvas.toDataURL("image/png");
}

export async function downloadNodePng(node, fileName) {
  const dataUrl = await nodeToPng(node);
  triggerDownload(dataUrl, `${safeName(fileName)}.png`);
}

/** One page PDF sized to the node itself. */
export async function downloadNodePdf(node, fileName, widthMm = 100) {
  const canvas = await nodeToCanvas(node);
  const dataUrl = canvas.toDataURL("image/png");
  const heightMm = (widthMm * canvas.height) / Math.max(canvas.width, 1);

  const pdf = new jsPDF({
    orientation: widthMm >= heightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [widthMm, heightMm],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, widthMm, heightMm, undefined, "FAST");
  pdf.save(`${safeName(fileName)}.pdf`);
}

/** A ready image as an A4 PDF, centred with a margin. */
export function downloadImageAsA4Pdf(dataUrl, imgW, imgH, fileName) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const scale = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  pdf.addImage(dataUrl, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
  pdf.save(`${safeName(fileName)}.pdf`);
}

export { triggerDownload, safeName };