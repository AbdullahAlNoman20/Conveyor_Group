// ---------------------------------------------------------------------------
// How to add REAL photos later (no code changes needed):
//   1. Food:    drop a file named <slug>.jpg (or .png/.webp) into
//               src/assets/food/  — e.g. khichuri.jpg for "Khichuri with Egg".
//   2. Profile: drop a file named <slug-of-full-name>.jpg into
//               src/assets/avatars/ — e.g. farzana-karim.jpg.
//   Vite's import.meta.glob below picks up ANY matching file automatically.
//   If both a placeholder .svg and a real .jpg exist for the same slug, the
//   real photo wins (see EXT_PRIORITY).
// ---------------------------------------------------------------------------

export function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EXT_PRIORITY = ["jpg", "jpeg", "png", "webp", "svg"];

function buildRegistry(globResult) {
  // globResult keys look like "../assets/food/khichuri.svg"
  const bySlug = {};
  for (const [path, mod] of Object.entries(globResult)) {
    const match = path.match(/([^/]+)\.(jpg|jpeg|png|webp|svg)$/i);
    if (!match) continue;
    const [, slug, ext] = match;
    const rank = EXT_PRIORITY.indexOf(ext.toLowerCase());
    const existing = bySlug[slug];
    if (!existing || rank < existing.rank) {
      bySlug[slug] = { url: mod.default, rank };
    }
  }
  return bySlug;
}

const foodGlob = import.meta.glob("../../assets/food/*.{jpg,jpeg,png,webp,svg}", { eager: true });
const avatarGlob = import.meta.glob("../../assets/avatars/*.{jpg,jpeg,png,webp,svg}", { eager: true });

const FOOD_REGISTRY = buildRegistry(foodGlob);
const AVATAR_REGISTRY = buildRegistry(avatarGlob);

export function foodImageFor(dishName) {
  const slug = slugify(dishName);
  return (FOOD_REGISTRY[slug] || FOOD_REGISTRY["default"])?.url;
}

export function avatarImageFor(personName) {
  const slug = slugify(personName);
  return (AVATAR_REGISTRY[slug] || AVATAR_REGISTRY["default"])?.url;
}
