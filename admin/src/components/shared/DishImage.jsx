import { foodImageFor } from "../services/imageRegistry";

/**
 * Renders a real <img>, imported locally (never hotlinked). Today that image
 * is a generated placeholder graphic; drop a real photo into
 * src/assets/food/<slug>.jpg (see imageRegistry.js for the naming rule) and
 * it replaces the placeholder automatically — no code changes needed.
 */
export function DishImage({ name, className = "", rounded = "rounded-t-xl", width, height = 300 }) {
  const src = foodImageFor(name);
  return (
    <img
      src={src}
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
