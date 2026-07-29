import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../../../components/hooks/useAuth";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";

export default function ClientQRCard() {
  const { user } = useAuth();
  const { push } = useToast();
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  if (!clients) return <Loader full label="Loading your QR card..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const qrPayload = JSON.stringify({
    clientId: me?.id,
    employeeId: me?.employeeId,
    status: me?.qrStatus,
  });

  function handleDownload() {
    const svg = document.getElementById("client-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${me?.employeeId || "qr-card"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    push("QR card downloaded as SVG.", "success");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My QR Card</h1>
        <p className="text-sm text-ink-400">Show this at the counter for the Manager to scan.</p>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex justify-center rounded-lg border border-ink-100 p-3">
          <QRCodeSVG id="client-qr-svg" value={qrPayload} size={160} level="M" />
        </div>
        <p className="mt-4 text-lg font-bold text-ink-900">{me?.employeeId}</p>
        <p className="text-sm text-ink-500">{me?.name}</p>
        <p className="text-xs text-ink-400">{me?.department}</p>
        <div className="mt-3 flex justify-center">
          <Badge tone={me?.qrStatus === "active" ? "active" : "expired"}>{me?.qrStatus}</Badge>
        </div>
        <p className="mt-2 text-xs text-ink-400">Issue Date: 2026-01-05</p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Download size={16} /> Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
