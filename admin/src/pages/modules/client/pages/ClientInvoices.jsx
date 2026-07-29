import { useEffect, useState } from "react";
import { Receipt, Printer, Mail, Download } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import { genInvoiceNumber } from "../../../../components/utils/idGenerator";
import Loader from "../../../../components/shared/Loader";

export default function ClientInvoices() {
  const { user } = useAuth();
  const { push } = useToast();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  if (!orders) return <Loader full label="Loading invoices..." />;

  const mine = orders.filter((o) => o.clientName?.includes(user?.name?.split(" ")[0] || ""));

  function action(kind, order) {
    if (kind === "print") window.print();
    else push(`Invoice for ${order.id} sent via ${kind} (mock).`, "info");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Invoices</h1>
        <p className="text-sm text-ink-400">One invoice is generated per order (SRS §19).</p>
      </div>

      <div className="space-y-3">
        {mine.map((o) => (
          <div key={o.id} className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-brand-600" />
                <div>
                  <p className="font-semibold text-ink-900">{genInvoiceNumber()}</p>
                  <p className="text-xs text-ink-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => action("print", o)} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold hover:bg-ink-50">
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => action("PDF", o)} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold hover:bg-ink-50">
                  <Download size={13} /> PDF
                </button>
                <button onClick={() => action("Email", o)} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold hover:bg-ink-50">
                  <Mail size={13} /> Email
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-1 text-sm text-ink-600">
              {o.items?.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.qty}x {i.name}</span>
                  <span>\u09F3{i.qty * i.unitPrice}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-ink-100 pt-2 text-sm font-bold text-ink-900">
              <span>Grand Total</span>
              <span>\u09F3{o.amount}</span>
            </div>
          </div>
        ))}
        {mine.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            No invoices yet.
          </p>
        )}
      </div>
    </div>
  );
}
