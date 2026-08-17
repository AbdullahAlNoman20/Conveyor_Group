// FILE: src/pages/modules/client/pages/ClientWalletTransactionDetail.jsx 
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import Loader from "../../../../components/shared/Loader";

export default function ClientWalletTransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState(null);
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () => {
      setTransactions(await dataStore.load("walletTransactions", "wallet-transactions.json"));
      setClients(await dataStore.load("clients", "clients.json"));
    })();
  }, []);

  if (!transactions || !clients) return <Loader full label="Loading transaction..." />;

  const tx = transactions.find((t) => t.id === id);
  const me = clients.find((c) => c.name === user?.name) || clients[0];

  if (!tx) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          Transaction not found.
        </p>
      </div>
    );
  }

  const isSalary = tx.paymentMethod === "salary";
  const isCredit = tx.amount >= 0;

  function print() {
    printOnLetterhead({
      title: `Transaction ${tx.id}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Wallet Transaction</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${tx.id} · ${tx.date}</p>
        <div class="row"><span class="label">Client</span><span>${me?.name || ""}</span></div>
        <div class="row"><span class="label">Type</span><span>${tx.type}</span></div>
        <div class="row"><span class="label">Source</span><span>${isSalary ? "Salary" : tx.type === "Recharge" ? "Cash Recharge" : "Wallet"}</span></div>
        ${tx.remarks ? `<div class="row"><span class="label">Remarks</span><span>${tx.remarks}</span></div>` : ""}
        <div class="row total"><span>Amount</span><span>${isCredit ? "+" : ""}Tk ${tx.amount}</span></div>
      `,
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Wallet
      </button>

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isCredit ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600"}`}>
            {isCredit ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
          </div>
          <div>
            <p className="font-bold text-ink-900">{tx.type}</p>
            <p className="text-xs text-ink-400">{tx.date} · {tx.id}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-ink-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-500">Client</span>
            <span className="font-medium text-ink-800">{me?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Paid From</span>
            <span className="font-medium text-ink-800">
              {tx.type === "Recharge" ? "Cash Recharge" : isSalary ? "Salary" : "Wallet"}
            </span>
          </div>
          {tx.remarks && (
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-ink-500">Remarks</span>
              <span className="text-right font-medium text-ink-800">{tx.remarks}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="text-sm font-semibold text-ink-700">Amount</span>
          <span className={`text-xl font-bold ${isCredit ? "text-emerald-600" : "text-brand-600"}`}>
            {isCredit ? "+" : ""}Tk {tx.amount}
          </span>
        </div>

        <button
          onClick={print}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Printer size={16} /> Print on Company Pad
        </button>
      </div>
    </div>
  );
}