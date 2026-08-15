// FILE: src/pages/modules/super-admin/pages/FinancialDashboard.jsx  (MODIFIED, full rewrite)
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import DateRangeFilter, { useDateRangeFilter } from "../../../../components/shared/DateRangeFilter";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";

function inRange(dateStr, from, to) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

/**
 * Every Manager-recorded purchase voucher and every order/wallet transaction
 * lands in the same shared dataStore collections this page reads live from
 * (useLiveCollection), so nothing here can drift out of sync with what
 * Managers are entering elsewhere.
 */
export default function FinancialDashboard() {
  const orders = useLiveCollection("orders", "orders.json");
  const vouchers = useLiveCollection("purchaseVouchers", "purchase-vouchers.json");
  const tx = useLiveCollection("walletTransactions", "wallet-transactions.json");
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range } =
    useDateRangeFilter("This Month");

  if (!orders || !vouchers || !tx) return <Loader full label="Loading financial dashboard..." />;

  const ordersInRange = orders.filter((o) => inRange(o.createdAt, range.from, range.to));
  const vouchersInRange = vouchers.filter((v) => inRange(v.date, range.from, range.to));
  const txInRange = tx.filter((t) => inRange(t.date, range.from, range.to));

  const salesIncome = ordersInRange.reduce((s, o) => s + (o.amount || 0), 0);
  const walletRecharge = txInRange.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalIncome = salesIncome + walletRecharge;
  const totalExpense = vouchersInRange.reduce((s, v) => s + v.amount, 0);
  const profit = totalIncome - totalExpense;

  const byCategory = vouchersInRange.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + v.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Financial Dashboard</h1>
       
      </div>

      <DateRangeFilter
        preset={preset}
        setPreset={setPreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        range={range}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Income" value={`Tk ${totalIncome.toLocaleString()}`} Icon={TrendingUp} accent="emerald" />
        <StatCard label="Total Expense" value={`Tk ${totalExpense.toLocaleString()}`} Icon={TrendingDown} accent="brand" />
        <StatCard
          label="Profit"
          value={`Tk ${profit.toLocaleString()}`}
          Icon={DollarSign}
          accent={profit >= 0 ? "emerald" : "brand"}
        />
        <StatCard label="Wallet Recharges" value={`Tk ${walletRecharge.toLocaleString()}`} Icon={PiggyBank} accent="sky" />
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
              <p className="text-ink-400">No expenses recorded in this range.</p>
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
        Tk {value.toLocaleString()}
      </span>
    </div>
  );
}