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
export default function QRScannerCamera({ onScan }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
    scannerRef.current = scanner;
    let stopped = false;

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
      .then(() => setReady(true))
      .catch((err) => {
        setError(
          err?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access and reload to scan."
            : "Couldn't start the camera on this device."
        );
      });

    return () => {
      stopped = true;
      scanner.stop().catch(() => {});
      scanner.clear().catch(() => {});
    };
  }, [onScan]);

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
