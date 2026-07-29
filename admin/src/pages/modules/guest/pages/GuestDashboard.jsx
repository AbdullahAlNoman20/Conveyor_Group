import { Clock, ClipboardList, Ban } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import { useAuth } from "../../../../components/hooks/useAuth";

export default function GuestDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Welcome, {user?.name}</h1>
        <p className="text-sm text-ink-400">Your temporary guest access summary.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Guest ID" value={user?.id} Icon={ClipboardList} accent="ink" />
        <StatCard label="Expiration" value="6 Hours" Icon={Clock} accent="amber" />
        <StatCard label="Active Orders" value={0} Icon={ClipboardList} accent="brand" />
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
