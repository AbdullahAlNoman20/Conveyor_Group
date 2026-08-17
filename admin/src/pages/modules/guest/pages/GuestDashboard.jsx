import { useMemo } from "react";
import { Clock, ClipboardList, Ban, Wallet, Printer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import ShareButton from "../../../../components/shared/ShareButton";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";

const VALID_STATUSES = ["completed", "ready", "preparing", "accepted", "pending", "awaiting_manager"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function GuestDashboard() {
  const { user } = useAuth();
  const orders = useLiveCollection("orders", "orders.json");

  const summary = useMemo(() => {
    const mine = (orders || []).filter(
      (o) => o.clientName?.toLowerCase().startsWith("guest") && VALID_STATUSES.includes(o.status)
    );

    const now = new Date();
    const todayStr = now.toDateString();
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let week = 0;
    let month = 0;
    let activeCount = 0;

    mine.forEach((o) => {
      const created = new Date(o.createdAt);
      if (created.toDateString() === todayStr) today += o.amount;
      if (created >= weekStart) week += o.amount;
      if (created >= monthStart) month += o.amount;
      if (!["completed", "cancelled", "rejected"].includes(o.status)) activeCount += 1;
    });

    return { today, week, month, activeCount, orderCount: mine.length };
  }, [orders]);

  if (!orders) return <Loader full label="Loading your dashboard..." />;

  const chartData = [
    { name: "Today", amount: summary.today },
    { name: "This Week", amount: summary.week },
    { name: "This Month", amount: summary.month },
  ];

  function printSummary() {
    printOnLetterhead({
      title: "Guest Spending Summary",
      bodyHtml: `
        <h2 style="margin:0 0 4px">Guest Spending Summary</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${escapeHtml(
          user?.name || "Guest"
        )} · ${escapeHtml(new Date().toLocaleString())}</p>
        <div class="row"><span class="label">Today</span><span>Tk ${escapeHtml(summary.today)}</span></div>
        <div class="row"><span class="label">This Week</span><span>Tk ${escapeHtml(summary.week)}</span></div>
        <div class="row total"><span>This Month</span><span>Tk ${escapeHtml(summary.month)}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Welcome, {user?.name}</h1>
          <p className="text-sm text-ink-400">Your spending summary for this visit — updates live.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={printSummary}
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50"
          >
            <Printer size={14} /> Print Summary
          </button>
          <ShareButton
            title="Guest Spending Summary"
            text={`Today: Tk ${summary.today} · Week: Tk ${summary.week} · Month: Tk ${summary.month}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Spent Today" value={`Tk ${summary.today}`} Icon={Wallet} accent="brand" />
        <StatCard label="Spent This Week" value={`Tk ${summary.week}`} Icon={Wallet} accent="amber" />
        <StatCard label="Spent This Month" value={`Tk ${summary.month}`} Icon={Wallet} accent="emerald" />
        <StatCard label="Active Orders" value={summary.activeCount} Icon={ClipboardList} accent="sky" />
        <StatCard label="Expiration" value="6 Hours" Icon={Clock} accent="ink" />
        <StatCard label="Total Orders" value={summary.orderCount} Icon={ClipboardList} accent="ink" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Spending Overview</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip formatter={(v) => [`Tk ${v}`, "Amount"]} />
            <Bar dataKey="amount" fill="#eb2a2d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Ban className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">As a Guest, you cannot:</p>
          <ul className="mt-1 list-inside list-disc">
            <li>Use the Wallet</li>
            <li>Access Monthly Billing</li>
            <li>Use Salary Deduction</li>
            <li>Modify Orders</li>
          </ul>
        </div>
      </div>
    </div>
  );
}