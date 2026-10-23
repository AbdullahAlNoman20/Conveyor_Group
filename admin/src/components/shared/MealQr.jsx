// admin/src/components/shared/MealQr.jsx
import { QRCodeSVG } from "qrcode.react";
import logo from "../../assets/logo.jpeg";

/**
 * The meal card QR, with the company mark in the middle.
 *
 * The logo covers part of the pattern, so the error correction has to be
 * raised to the highest level to compensate. At level H roughly a third of the
 * code can be obscured and still read, which is what keeps a logo bearing card
 * scanning as reliably as a plain one. The cutout is kept under a fifth of the
 * width for the same reason.
 */
export default function MealQr({ value, size = 92, className = "" }) {
  const logoSize = Math.round(size * 0.2);

  return (
    <QRCodeSVG
      value={value || ""}
      size={size}
      level="H"
      marginSize={2}
      className={className}
      imageSettings={{
        src: logo,
        height: logoSize,
        width: logoSize,
        // Clearing behind the mark keeps its edge crisp against the pattern,
        // which matters more to a camera than it looks.
        excavate: true,
      }}
    />
  );
}