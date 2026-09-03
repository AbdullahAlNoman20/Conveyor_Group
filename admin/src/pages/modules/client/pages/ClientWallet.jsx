import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, ArrowDownCircle, Eye } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function ClientWallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [transactions, setTransactions] = useState(null);

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setTransactions(await dataStore.load("walletTransactions", "wallet-transactions.json"));
    })();
  }, []);

  const me = (clients || []).find((c) => c.name === user?.name) || (clients || [])[0];
  const myTx = (transactions || []).filter((t) => t.clientId === me?.id);
  const sorted = [...myTx].sort((a, b) => new Date(b.date) - new Date(a.date));
  const { page, setPage, totalPages, pageItems: pagedTx } = usePagination(sorted, 10);

  if (!clients || !transactions) return <Loader full label="Loading salary deduction history..." />;

  const totalDeducted = myTx.reduce((s, t) => s + Math.abs(t.amount), 0);
  const now = new Date();
  const monthDeducted = myTx
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  function viewDetail(t) {
    navigate(`/app/client/wallet/${t.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Salary Deduction</h1>
        <p className="text-sm text-ink-400">Every meal you've ordered is deducted from your salary — see the full history here.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="This Month's Deduction" value={`Tk ${monthDeducted}`} Icon={Banknote} accent="brand" />
        <StatCard label="Total Deducted" value={`Tk ${totalDeducted}`} Icon={ArrowDownCircle} accent="ink" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Deduction History</h2>
        <div className="space-y-2">
          {pagedTx.map((t) => (
            <button
              key={t.id}
              onClick={() => viewDetail(t)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-left text-sm hover:bg-ink-100"
            >
              <span className="flex items-center gap-2 font-medium text-ink-700">
                <ArrowDownCircle size={16} className="text-brand-600" /> {t.type}
              </span>
              <span className="hidden text-ink-400 sm:inline">{t.date}</span>
              <span className="font-semibold text-brand-600">-Tk {Math.abs(t.amount)}</span>
              <Eye size={14} className="shrink-0 text-ink-400" />
            </button>
          ))}
          {myTx.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No deductions yet.</p>}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}