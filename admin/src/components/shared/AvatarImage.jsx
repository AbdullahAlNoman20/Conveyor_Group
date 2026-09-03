import { avatarImageFor } from "../services/imageRegistry";

/**
 * Real profile-photo <img>, imported locally. Drop a real photo into
 * src/assets/avatars/<slug-of-full-name>.jpg (see imageRegistry.js) and it
 * replaces the generated placeholder automatically.
 */
export default function AvatarImage({ name, photo, width, height, size, className = "" }) {
  const src = photo || avatarImageFor(name);
  const w = width ?? size ?? 40;
  const h = height ?? size ?? 40;
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      style={{ width: w, height: h }}
      className={`rounded-full object-cover ${className}`}
    />
  );
}
