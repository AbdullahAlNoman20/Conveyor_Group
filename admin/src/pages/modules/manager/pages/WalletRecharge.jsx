// FILE: src/pages/modules/manager/pages/WalletRecharge.jsx (MODIFIED — tags recharges as an earning source)
import { useEffect, useState } from "react";
import { Wallet, Plus, TrendingUp, Receipt } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function WalletRecharge() {
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setTransactions(await dataStore.load("walletTransactions", "wallet-transactions.json"));
    })();
  }, []);

  const sortedTx = (transactions || []).slice().reverse();
  const { page, setPage, totalPages, pageItems: pagedTx } = usePagination(sortedTx, 10);

  if (!clients || !transactions) return <Loader full label="Loading wallet recharge..." />;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todaysRecharges = transactions.filter((t) => t.type === "Recharge" && t.date === todayISO);
  const todayTotal = todaysRecharges.reduce((s, t) => s + t.amount, 0);

  async function submit(e) {
    e.preventDefault();
    const value = sanitizeNumber(amount, { min: 1, max: 100000 });
    if (!clientId || value === null) {
      push("Select a client and enter a valid amount.", "error");
      return;
    }
    const client = clients.find((c) => c.id === clientId);

    const nextClients = await dataStore.update("clients", (c) => c.id === clientId, {
      walletBalance: (client.walletBalance || 0) + value,
    });
    setClients(nextClients);

    const tx = {
      id: genId("WT"),
      clientId,
      type: "Recharge",
      amount: value,
      date: todayISO,
      paymentMethod: "cash",
      source: "recharge", // cash physically received — counts toward restaurant earning
    };
    const nextTx = await dataStore.insert("walletTransactions", tx);
    setTransactions(nextTx);

    socket.emit(SOCKET_EVENTS.WALLET_RECHARGED, {
      message: `Wallet recharged with Tk ${value} for ${client.name}.`,
      recipientNames: [client.name],
    });
    push(`Tk ${value} added to ${client.name}'s Meal Coin balance.`, "success");
    setAmount("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Wallet Recharge</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Recharged Today" value={`Tk ${todayTotal.toLocaleString()}`} Icon={TrendingUp} accent="emerald" />
        <StatCard label="Recharges Today" value={todaysRecharges.length} Icon={Receipt} accent="brand" />
        <StatCard label="Total Transactions" value={transactions.length} Icon={Wallet} accent="sky" />
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-ink-100 bg-white p-5 sm:grid-cols-3">
        <FormField label="Client" required>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">-- Select client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · Tk {c.walletBalance}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Cash Received (Tk)" required>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>
        <div className="flex items-end">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus size={16} /> Recharge Meal Coin
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <Wallet size={16} /> Recent Transactions
        </h2>
        <div className="space-y-2">
          {pagedTx.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="text-ink-700">{clients.find((c) => c.id === t.clientId)?.name || t.clientId}</span>
              <span className="text-ink-400">{t.type}</span>
              <span className="text-ink-400">{t.date}</span>
              <span className={`font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-brand-600"}`}>
                {t.amount >= 0 ? "+" : ""}
                {t.amount}
              </span>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}