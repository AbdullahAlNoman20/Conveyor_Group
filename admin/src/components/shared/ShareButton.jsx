import { Share2 } from "lucide-react";
import { useToast } from "../hooks/useToast";

export default function ShareButton({
  title,
  text,
  url,
  className = "",
  label = "Share",
}) {
  const { push } = useToast();

  async function handleShare() {
    const shareData = {
      title: title || "Conveyor Group Restaurant",
      text: text || "",
      url: url || window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`
        );

        push(
          "Copied to clipboard — sharing not supported on this browser.",
          "info"
        );
      } else {
        push("Sharing is not supported on this device.", "error");
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        push("Could not share right now.", "error");
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:border-brand-300 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${className}`}
    >
      {/* Shine sweep */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-brand-500/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />

      {/* Underline sweep */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] scale-x-0 bg-brand-600 opacity-70 transition-transform duration-200 ease-out group-hover:scale-x-100"
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        <Share2 size={16} />
        {label}
      </span>
    </button>
  );
}