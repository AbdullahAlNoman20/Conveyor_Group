// Branded, illustrated stand-ins for real food photography (per design-phase
// instruction: no backend/real assets yet). Each dish gets a distinct emoji
// + gradient so the menu reads as genuinely visual, not just a text list.
// Swap `emoji`+`gradient` for a real `photo` URL per item once photography
// is available — every consumer below already prefers `photo` if present.

export const DISH_VISUALS = {
  "Khichuri with Egg": { emoji: "🍲", gradient: "from-amber-400 to-orange-500" },
  "Egg Curry with Rice": { emoji: "🍳", gradient: "from-yellow-400 to-amber-500" },
  "Fish Curry with Rice": { emoji: "🐟", gradient: "from-sky-400 to-blue-600" },
  "Chicken Curry with Rice": { emoji: "🍗", gradient: "from-orange-400 to-brand-600" },
  "Beef Curry with Rice": { emoji: "🥩", gradient: "from-red-600 to-ink-800" },
  "Mixed Vegetable with Rice": { emoji: "🥦", gradient: "from-emerald-400 to-green-600" },
  "Special Menu": { emoji: "✨🍽️", gradient: "from-purple-500 to-brand-600" },
  "Grilled Sandwich": { emoji: "🥪", gradient: "from-amber-300 to-amber-600" },
  "Chicken Fried Rice": { emoji: "🍛", gradient: "from-orange-300 to-orange-600" },
  "Coffee": { emoji: "☕", gradient: "from-ink-600 to-ink-900" },
  "Fresh Lime Water": { emoji: "🍋", gradient: "from-lime-400 to-emerald-500" },
  "Vegetable Samosa": { emoji: "🥟", gradient: "from-amber-400 to-yellow-600" },
  "Singara": { emoji: "🥟", gradient: "from-orange-400 to-amber-600" },
  "Beef Roll": { emoji: "🌯", gradient: "from-red-500 to-brand-700" },
};

export const DEFAULT_VISUAL = { emoji: "🍽️", gradient: "from-ink-400 to-ink-700" };

export function visualFor(name) {
  return DISH_VISUALS[name] || DEFAULT_VISUAL;
}

export function DishImage({ name, className = "h-28" }) {
  const { emoji, gradient } = visualFor(name);
  return (
    <div
      className={`flex items-center justify-center rounded-t-xl bg-gradient-to-br text-4xl ${gradient} ${className}`}
      role="img"
      aria-label={name}
    >
      {emoji}
    </div>
  );
}
