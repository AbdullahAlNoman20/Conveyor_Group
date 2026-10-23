// admin/src/components/shared/PrintArea.jsx
import { useEffect } from "react";

/**
 * Prints whatever is inside it, and nothing else on the page.
 *
 * Mounting this and calling window.print() keeps the real React tree in play,
 * which matters for ID cards: the QR is a live SVG component, so rebuilding
 * the card as an HTML string for an iframe would mean maintaining a second
 * copy of the design and generating QR codes a second way.
 */
export default function PrintArea({ children, onDone }) {
  useEffect(() => {
    // One frame so the browser has laid the cards out and decoded the photos
    // before the dialog opens.
    const images = Array.from(document.querySelectorAll(".print-area img"));
    const pending = images.filter((img) => !img.complete);

    let cancelled = false;

    function go() {
      if (cancelled) return;
      window.print();
      onDone?.();
    }

    if (pending.length === 0) {
      const t = setTimeout(go, 120);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    let left = pending.length;
    const settle = () => {
      left -= 1;
      if (left <= 0) setTimeout(go, 120);
    };

    pending.forEach((img) => {
      img.addEventListener("load", settle, { once: true });
      img.addEventListener("error", settle, { once: true });
    });

    // Never hang on a photo that resolves neither way.
    const guard = setTimeout(go, 4000);

    return () => {
      cancelled = true;
      clearTimeout(guard);
    };
  }, [onDone]);

  return <div className="print-area">{children}</div>;
}