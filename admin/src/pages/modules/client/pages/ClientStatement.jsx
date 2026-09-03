// FILE: src/pages/modules/client/pages/ClientStatement.jsx (FULL REWRITE — real Excel/PDF, eye-icon to OrderDetail)
import { useNavigate } from "react-router-dom";
import { Download, FileText, Eye } from "lucide-react";
import ShareButton from "../../../../components/shared/ShareButton";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function ClientStatement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const clients = useLiveCollection("clients", "clients.json");
  const orders = useLiveCollection("orders", "orders.json");

  const clientsList = clients || [];
  const ordersList = orders || [];

  const me = clientsList.find((c) => c.name === user?.name) || clientsList[0];
  const now = new Date();
  const monthOrders = ordersList.filter((o) => {
    if (!(o.clientId === user?.id || o.clientName === user?.name)) return false;
    if (["cancelled", "rejected"].includes(o.status)) return false;
    const d = new Date(o.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const sorted = [...monthOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalAmount = monthOrders.reduce((s, o) => s + o.amount, 0);
  const walletPortion = monthOrders.filter((o) => o.paymentMethod !== "salary").reduce((s, o) => s + o.amount, 0);
  const salaryPortion = monthOrders.filter((o) => o.paymentMethod === "salary").reduce((s, o) => s + o.amount, 0);

  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(sorted, 12);

  const monthLabel = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  if (!clients || !orders) return <Loader full label="Loading your statement..." />;

  function downloadExcel() {
    exportToExcel(
      monthOrders.map((o) => ({
        Date: new Date(o.createdAt).toLocaleDateString(),
        Order: o.id,
        Items: o.items?.map((i) => `${i.qty}x ${i.name}`).join(", "),
        "Paid Via": o.paymentMethod === "salary" ? "Salary" : "Wallet",
        "Amount (Tk)": o.amount,
        Status: o.status,
      })),
      `${user?.name || "statement"}-${now.getFullYear()}-${now.getMonth() + 1}`
    );
  }

  function printStatement() {
    printOnLetterhead({
      title: `Monthly Statement — ${monthLabel}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Monthly Statement — ${monthLabel}</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${me?.name} · ${me?.employeeId || ""}</p>
        <table>
          <thead><tr><th>Date</th><th>Order</th><th>Items</th><th>Paid Via</th><th>Amount</th></tr></thead>
          <tbody>
            ${monthOrders
              .map(
                (o) =>
                  `<tr><td>${new Date(o.createdAt).toLocaleDateString()}</td><td>${o.id}</td><td>${(o.items || [])
                    .map((i) => `${i.qty}x ${i.name}`)
                    .join(", ")}</td><td>${o.paymentMethod === "salary" ? "Salary" : "Wallet"}</td><td>Tk ${o.amount}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="row"><span class="label">Wallet Portion</span><span>Tk ${walletPortion}</span></div>
        <div class="row"><span class="label">Salary Portion</span><span>Tk ${salaryPortion}</span></div>
        <div class="row total"><span>Total</span><span>Tk ${totalAmount}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Monthly Statement</h1>
          <p className="text-sm text-ink-400">{monthLabel} summary for {me?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printStatement} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileText size={14} /> Print / PDF
          </button>
          <button onClick={downloadExcel} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Download size={14} /> Excel
          </button>
          <ShareButton title={`Monthly Statement — ${monthLabel}`} text={`Total: Tk ${totalAmount}`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Orders" value={monthOrders.length} accent="ink" />
        <StatCard label="Total Amount" value={`Tk ${totalAmount}`} accent="brand" />
        <StatCard label="Wallet Portion" value={`Tk ${walletPortion}`} accent="emerald" />
        <StatCard label="Salary Portion" value={`Tk ${salaryPortion}`} accent="amber" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Orders This Month</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Order</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pagedOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 font-medium text-ink-800">{o.id}</td>
                  <td className="py-2">
                    <Badge tone={o.status}>{o.status}</Badge>
                  </td>
                  <td className="py-2 text-right font-semibold text-ink-900">Tk {o.amount}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => navigate(`/app/client/orders/${o.id}`)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {monthOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-400">No orders this month.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-1 pt-1" />
      </div>
    </div>
  );
}