import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building2, Badge as BadgeIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

export default function ClientProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clients = useLiveCollection("clients", "clients.json");

  if (!clients) return <Loader full label="Loading profile..." />;
  const person = clients.find((c) => c.id === id);

  if (!person) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/app/super-admin/clients")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back to Clients
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">Client not found.</p>
      </div>
    );
  }

  const qrValue = JSON.stringify({ clientId: person.id, employeeId: person.employeeId, status: person.qrStatus });

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/app/super-admin/clients")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <AvatarImage name={person.name} size={56} />
            <div>
              <p className="text-lg font-bold text-ink-900">{person.name}</p>
              <p className="text-xs text-ink-400">{person.designation || "Client"}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-sm">
            {person.email && <Row icon={Mail} label="Email" value={person.email} />}
            {person.phone && <Row icon={Phone} label="Phone" value={person.phone} />}
            {person.department && <Row icon={Building2} label="Department" value={person.department} />}
            {person.employeeId && <Row icon={BadgeIcon} label="Employee ID" value={person.employeeId} />}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {person.employmentType && <Badge tone="active">{person.employmentType}</Badge>}
            {person.mealPlan && <Badge tone="pending">{person.mealPlan}</Badge>}
            <Badge tone={person.status === "active" ? "active" : "cancelled"}>{person.status}</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-950 to-ink-800 p-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Conveyor Group Restaurant</p>
          <p className="mt-0.5 text-[10px] text-ink-400">Client ID Card</p>
          <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-2">
            <QRCodeSVG value={qrValue} size={140} level="M" />
          </div>
          <p className="mt-3 text-sm font-bold">{person.name}</p>
          <p className="text-xs text-ink-300">{person.employeeId}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
      <Icon size={14} className="text-ink-400" />
      <div>
        <p className="text-[11px] text-ink-400">{label}</p>
        <p className="font-medium text-ink-800">{value}</p>
      </div>
    </div>
  );
}