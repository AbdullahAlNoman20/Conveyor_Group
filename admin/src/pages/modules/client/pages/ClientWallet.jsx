// FILE: src/pages/modules/client/pages/ClientWallet.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  Printer,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

function classify(t) {
  if (t.type === "Recharge") return "recharge";
  return t.paymentMethod === "salary" ? "salary" : "wallet";
}

export default function ClientWallet() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [defaultMethod, setDefaultMethod] = useState("wallet");
  const [filter, setFilter] = useState("all"); // all | wallet | salary

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setTransactions(
        await dataStore.load("walletTransactions", "wallet-transactions.json"),
      );
    })();
  }, []);

  const me =
    (clients || []).find((c) => c.name === user?.name) || (clients || [])[0];
  const myTx = (transactions || []).filter((t) => t.clientId === me?.id);
  const filteredTx =
    filter === "all" ? myTx : myTx.filter((t) => classify(t) === filter);
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedTx,
  } = usePagination(filteredTx, 10);

  if (!clients || !transactions)
    return <Loader full label="Loading wallet..." />;

  const walletSpend = myTx
    .filter((t) => classify(t) === "wallet")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const salarySpend = myTx
    .filter((t) => classify(t) === "salary")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  async function saveDefaultMethod(method) {
    setDefaultMethod(method);
    push(
      `Default payment method set to ${method === "wallet" ? "Wallet" : "Salary"}.`,
      "success",
    );
  }

  function viewDetail(t) {
    navigate(`/app/client/wallet/${t.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">
          Wallet & Salary Deduction
        </h1>
        <p className="text-sm text-ink-400">
          Track what you've spent from your wallet vs. your salary.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={`Tk ${me?.walletBalance ?? 0}`}
          Icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Current Month Bill"
          value={`Tk ${me?.monthlyBill ?? 0}`}
          Icon={Banknote}
          accent="brand"
        />
        <StatCard
          label="Wallet Spend"
          value={`Tk ${walletSpend}`}
          Icon={ArrowDownCircle}
          accent="amber"
        />
        <StatCard
          label="Salary Spend"
          value={`Tk ${salarySpend}`}
          Icon={ArrowDownCircle}
          accent="ink"
        />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Default Payment Method
        </h2>
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
          You can still override this per order at checkout ("Pay From: Wallet /
          Salary").
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink-700">
            Wallet Transaction History
          </h2>
          <div className="flex gap-1 rounded-lg bg-ink-50 p-1">
            {[
              ["all", "All"],
              ["wallet", "Wallet"],
              ["salary", "Salary"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === key
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {pagedTx.map((t) => (
            <button
              key={t.id}
              onClick={() => viewDetail(t)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-left text-sm hover:bg-ink-100"
            >
              <span className="flex items-center gap-2 font-medium text-ink-700">
                {t.amount >= 0 ? (
                  <ArrowUpCircle size={16} className="text-emerald-600" />
                ) : (
                  <ArrowDownCircle size={16} className="text-brand-600" />
                )}
                {t.type}
                {classify(t) === "salary" && (
                  <span className="rounded bg-ink-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-600">
                    Salary
                  </span>
                )}
              </span>
              <span className="hidden text-ink-400 sm:inline">{t.date}</span>
              <span
                className={`font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-brand-600"}`}
              >
                {t.amount >= 0 ? "+" : ""}
                {t.amount}
              </span>
              <Eye size={14} className="shrink-0 text-ink-400" />
            </button>
          ))}
          {filteredTx.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">
              No transactions yet.
            </p>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
