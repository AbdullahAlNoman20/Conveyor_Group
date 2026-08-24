import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CameraOff } from "lucide-react";

const ELEMENT_ID = "cccms-qr-camera";

/**
 * Opens the device's back camera automatically and decodes any QR code it
 * sees, calling onScan(decodedText) once per successful read (debounced by
 * stopping the scanner immediately after a hit, so the same card can't fire
 * twice in a row while it's still in frame).
 */
export default function QRScannerCamera({ onScan, onError }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stopped = false;
    let scanner = null;

    function fail(msg) {
      if (stopped) return;
      setError(msg);
      onError?.(msg);
    }

    // Everything below is wrapped in try/catch on purpose: html5-qrcode can
    // throw SYNCHRONOUSLY (not just reject its promise) when the browser
    // has no camera API available at all — most commonly because the page
    // isn't served over HTTPS on a phone, which blocks navigator.mediaDevices
    // entirely. An uncaught synchronous throw here escapes straight to the
    // nearest error boundary and renders as a hard "500 / something went
    // wrong" page instead of the friendly in-place message below — this was
    // the actual crash. Wrapping it turns that crash into a graceful fallback.
    try {
      if (!window.isSecureContext) {
        fail("Camera requires a secure (HTTPS) connection on mobile. Use manual search below instead.");
        return () => {};
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        fail("Camera isn't available on this browser. Use manual search below instead.");
        return () => {};
      }

      scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {
            // Per-frame "no QR found yet" callback — expected constantly, not an error.
          }
        )
        .then(() => {
          if (!stopped) setReady(true);
        })
        .catch((err) => {
          fail(
            err?.name === "NotAllowedError"
              ? "Camera permission was denied. Allow camera access, or use manual search below."
              : "Couldn't start the camera on this device. Use manual search below instead."
          );
        });
    } catch {
      fail("Couldn't start the camera on this device. Use manual search below instead.");
    }

    return () => {
      stopped = true;
      try {
        scanner?.stop().catch(() => {});
        scanner?.clear().catch(() => {});
      } catch {
        // Ignore teardown errors — nothing to recover, nothing to crash.
      }
    };
  }, [onScan, onError]);

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-950">
      <div id={ELEMENT_ID} className="mx-auto aspect-square max-w-sm" />
      {!ready && !error && (
        <p className="p-4 text-center text-sm text-ink-300">Starting camera…</p>
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-ink-200">
          <CameraOff size={22} />
          {error}
        </div>
      )}
    </div>
  );
}
