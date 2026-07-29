import { Construction } from "lucide-react";

export default function ComingSoon({ title, note }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
      <Construction size={36} className="text-brand-500" />
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      <p className="max-w-md text-sm text-ink-400">
        {note || "This module is scheduled for a later build iteration and will be implemented next."}
      </p>
    </div>
  );
}
