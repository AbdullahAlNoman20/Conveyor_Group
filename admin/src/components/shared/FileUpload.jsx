import { useRef, useState } from "react";
import { Paperclip, X, FileText } from "lucide-react";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — keeps the base64 data URL reasonable for localStorage

/** Simple file-to-dataURL uploader (no backend yet — this stores the
 * document inline on the request record; swap for a real upload endpoint
 * once one exists, callers only care about onChange(dataUrl, fileName)). */
export default function FileUpload({ label, value, fileName, onChange, required, accept = "image/*,.pdf", hint, error }) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError("File is too large — please upload something under 2MB.");
      return;
    }
    setLocalError("");
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result, file.name);
    reader.readAsDataURL(file);
  }

  function clear() {
    onChange("", "");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-ink-700">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>
      )}
      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 px-3 py-4 text-sm text-ink-500 hover:border-brand-400 hover:text-brand-600"
        >
          <Paperclip size={16} /> Click to upload a file
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-ink-700">
            <FileText size={16} className="shrink-0 text-brand-600" />
            <span className="truncate">{fileName || "Uploaded file"}</span>
          </span>
          <button type="button" onClick={clear} className="shrink-0 text-ink-400 hover:text-brand-600">
            <X size={14} />
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
      {hint && !localError && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {(localError || error) && <p className="mt-1 text-xs font-medium text-brand-600">{localError || error}</p>}
    </div>
  );
}