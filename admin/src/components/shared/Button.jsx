// FILE: src/components/shared/Button.jsx  (NEW)
import { Loader2, Check } from "lucide-react";

export default function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  success = false,
  fullWidth = false,
  className = "",
  children,
  ...rest
}) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold overflow-hidden " +
    "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-lg",
    lg: "px-6 py-3 text-sm rounded-lg",
    icon: "p-2 rounded-lg",
  };

  // "group" enables the underline/shine child spans to react to hover on
  // THIS button specifically, without leaking into sibling buttons.
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 group",
    secondary: "border border-ink-200 text-ink-700 bg-white hover:border-brand-300 group",
    danger: "bg-ink-800 text-white hover:bg-brand-600 group",
    ghost: "text-ink-500 hover:text-brand-600 group",
    icon: "text-ink-500 hover:text-brand-600 hover:bg-ink-50 group",
  };

  const sizeClass = variant === "icon" ? sizes.icon : sizes[size] || sizes.md;
  // Outline-style buttons put the underline on top (reads more naturally
  // against a white background); solid buttons put it on the bottom.
  const underlineAt = variant === "secondary" || variant === "ghost" ? "top-0" : "bottom-0";

  return (
    <Tag
      className={`${base} ${sizeClass} ${variants[variant] || variants.primary} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {/* Shine sweep — decorative only, never intercepts clicks. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      {/* Underline sweep — grows outward from the center on hover. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 ${underlineAt} h-[2px] scale-x-0 bg-current opacity-70 transition-transform duration-200 ease-out group-hover:scale-x-100`}
      />

      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : success ? (
          <Check size={16} className="animate-[successPop_.35s_ease-out]" />
        ) : (
          Icon && iconPosition === "left" && <Icon size={size === "sm" ? 14 : 16} />
        )}
        {children}
        {!loading && !success && Icon && iconPosition === "right" && <Icon size={16} />}
      </span>
    </Tag>
  );
}