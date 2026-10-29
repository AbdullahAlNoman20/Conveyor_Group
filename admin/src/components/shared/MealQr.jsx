// admin/src/components/shared/MealQr.jsx
import { QRCodeSVG } from "qrcode.react";
import qrLogo from "../../assets/logo.jpeg";

// A see-through pixel. It is only there so the QR clears a clean square in the
// middle; the real logo is drawn on top as a normal <img>, which the browser
// scales far more sharply than an <image> inside the SVG.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * QR with the company logo in the middle.
 *
 * Level H lets about a third of the code be covered and still scan, so a logo
 * of about a fifth of the width is safe. `fluid` makes it fill its parent
 * width instead of a fixed pixel size.
 */
export default function MealQr({ value, size = 92, fluid = false, logoRatio = 0.22, className = "" }) {
  const box = Math.round(size * logoRatio);
  const pad = Math.max(2, Math.round(box * 0.1));

  return (
    <div
      className={`relative ${fluid ? "aspect-square w-full" : "inline-block"} ${className}`}
      style={fluid ? undefined : { width: size, height: size }}
    >
      <QRCodeSVG
        value={value || " "}
        size={size}
        level="H"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#0a0a0a"
        style={{ width: "100%", height: "100%", display: "block" }}
        imageSettings={{ src: BLANK, width: box, height: box, excavate: true }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[18%] bg-white"
        style={{ width: `${logoRatio * 100}%`, height: `${logoRatio * 100}%`, padding: pad }}
      >
        <img
          src={qrLogo}
          alt=""
          draggable={false}
          className="h-full w-full object-contain"
          style={{ imageRendering: "auto" }}
        />
      </div>
    </div>
  );
}

export { qrLogo };