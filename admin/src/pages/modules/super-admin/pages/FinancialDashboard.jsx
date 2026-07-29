import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";

export default function FinancialDashboard() {
  const [orders, setOrders] = useState(null);
  const [vouchers, setVouchers] = useState(null);
  const [tx, setTx] = useState(null);

  useEffect(() => {
    (async () => {
      setOrders(await dataStore.load("orders", "orders.json"));
      setVouchers(await dataStore.load("purchaseVouchers", "purchase-vouchers.json"));
      setTx(await dataStore.load("walletTransactions", "wallet-transactions.json"));
    })();
  }, []);

  if (!orders || !vouchers || !tx) return <Loader full label="Loading financial dashboard..." />;

  const salesIncome = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const walletRecharge = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalIncome = salesIncome + walletRecharge;
  const totalExpense = vouchers.reduce((s, v) => s + v.amount, 0);
  const profit = totalIncome - totalExpense;

  const byCategory = vouchers.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + v.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Financial Dashboard</h1>
        <p className="text-sm text-ink-400">Income vs expense across the whole cafeteria (SRS §22).</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Income" value={`\u09F3${totalIncome.toLocaleString()}`} Icon={TrendingUp} accent="emerald" />
        <StatCard label="Total Expense" value={`\u09F3${totalExpense.toLocaleString()}`} Icon={TrendingDown} accent="brand" />
        <StatCard
          label="Profit"
          value={`\u09F3${profit.toLocaleString()}`}
          Icon={DollarSign}
          accent={profit >= 0 ? "emerald" : "brand"}
        />
        <StatCard label="Wallet Recharges" value={`\u09F3${walletRecharge.toLocaleString()}`} Icon={PiggyBank} accent="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Income Sources</h2>
          <div className="space-y-2 text-sm">
            <Row label="Cash / Order Sales" value={salesIncome} />
            <Row label="Wallet Recharge" value={walletRecharge} />
            <Row label="Company Billing" value={0} />
            <Row label="Guest Payment" value={0} />
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Expense by Category</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(byCategory).map(([cat, amt]) => (
              <Row key={cat} label={cat} value={amt} negative />
            ))}
            {Object.keys(byCategory).length === 0 && (
              <p className="text-ink-400">No expenses recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, negative }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
      <span className="text-ink-600">{label}</span>
      <span className={`font-semibold ${negative ? "text-brand-600" : "text-emerald-600"}`}>
        \u09F3{value.toLocaleString()}
      </span>
    </div>
  );
}
