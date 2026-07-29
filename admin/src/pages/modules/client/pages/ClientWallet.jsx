import { useEffect, useState } from "react";
import { Wallet, Banknote, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";

export default function ClientWallet() {
  const { user } = useAuth();
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [defaultMethod, setDefaultMethod] = useState("wallet");

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setTransactions(await dataStore.load("walletTransactions", "wallet-transactions.json"));
    })();
  }, []);

  if (!clients || !transactions) return <Loader full label="Loading wallet..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const myTx = transactions.filter((t) => t.clientId === me?.id);

  async function saveDefaultMethod(method) {
    setDefaultMethod(method);
    push(`Default payment method set to ${method === "wallet" ? "Wallet" : "Salary"}.`, "success");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Wallet & Salary Deduction</h1>
        <p className="text-sm text-ink-400">
          Guests cannot access this module — SRS §17.2 restricts wallet use to permanent clients only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Wallet Balance" value={`\u09F3${me?.walletBalance ?? 0}`} Icon={Wallet} accent="emerald" />
        <StatCard label="Current Month Bill" value={`\u09F3${me?.monthlyBill ?? 0}`} Icon={Banknote} accent="brand" />
        <StatCard label="Meal Benefit" value={me?.mealBenefit ?? "Self Paid"} Icon={Wallet} accent="ink" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Default Payment Method</h2>
        <div className="flex gap-2">
          {["wallet", "salary", "company"].map((m) => (
            <button
              key={m}
              onClick={() => saveDefaultMethod(m)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                defaultMethod === m
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-400">
          You can still override this per order at checkout ("Pay From: Wallet / Salary").
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Wallet Transaction History</h2>
        <div className="space-y-2">
          {myTx.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-ink-700">
                {t.amount >= 0 ? (
                  <ArrowUpCircle size={16} className="text-emerald-600" />
                ) : (
                  <ArrowDownCircle size={16} className="text-brand-600" />
                )}
                {t.type}
              </span>
              <span className="text-ink-400">{t.date}</span>
              <span className={`font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-brand-600"}`}>
                {t.amount >= 0 ? "+" : ""}
                {t.amount}
              </span>
            </div>
          ))}
          {myTx.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
