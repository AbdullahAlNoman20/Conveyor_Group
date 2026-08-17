import { Share2 } from "lucide-react";
import { useToast } from "../hooks/useToast";

export default function ShareButton({ title, text, url, className = "", label = "Share" }) {
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
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        push("Copied to clipboard — sharing not supported on this browser.", "info");
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
      className={`flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50 ${className}`}
    >
      <Share2 size={14} /> {label}
    </button>
  );
}