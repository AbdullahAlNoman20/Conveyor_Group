// FILE: src/components/shared/DishImage.jsx  (MODIFIED — now respects an
// explicit `src` override, instead of always recomputing from `name`)
import { foodImageFor } from "../services/imageRegistry";

/**
 * Renders a real <img>, imported locally (never hotlinked).
 *
 * Resolution order:
 *   1. If an explicit `src` is passed (e.g. Menu Management's "Image Path"
 *      field, or a freshly uploaded preview data-URL) — use it as-is.
 *   2. Otherwise fall back to the name -> slug -> local asset lookup in
 *      imageRegistry.js (src/assets/food/<slug>.*), so every OTHER screen
 *      that just renders `<DishImage name={...} />` keeps working exactly
 *      as before with zero changes.
 */
export function DishImage({ name, src, className = "", rounded = "rounded-t-xl", width, height = 300 }) {
  const resolvedSrc = src || foodImageFor(name);
  return (
    <img
      src={resolvedSrc}
      alt={name}
      loading="lazy"
      width={width}
      height={height}
      className={`w-full object-cover ${rounded} ${className}`}
      style={{ width: width ?? "100%", height, flexShrink: 0 }}
    />
  );
}

export default DishImage;