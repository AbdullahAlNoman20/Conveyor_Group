import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Badge as BadgeIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

const CONFIG = {
  managers: { file: "managers.json", key: "managers", loginRole: "manager" },
  "kitchen-staff": { file: "kitchen-staff.json", key: "kitchenStaff", loginRole: "kitchen_head" },
};

export default function StaffProfileView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const type = params.get("type") === "kitchen-staff" ? "kitchen-staff" : "managers";
  const cfg = CONFIG[type];
  const navigate = useNavigate();
  const staff = useLiveCollection(cfg.key, cfg.file);

  if (!staff) return <Loader full label="Loading profile..." />;
  const person = staff.find((s) => s.id === id);
  const backTo = type === "kitchen-staff" ? "/app/super-admin/kitchen-staff" : "/app/super-admin/managers";

  if (!person) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backTo)} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">Not found.</p>
      </div>
    );
  }

  const qrValue = JSON.stringify({ staffId: person.id, role: cfg.loginRole });

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(backTo)} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <AvatarImage name={person.name} size={56} />
            <div>
              <p className="text-lg font-bold text-ink-900">{person.name}</p>
              <p className="text-xs text-ink-400">{person.role || (type === "kitchen-staff" ? "Kitchen Staff" : "Manager")}</p>
            </div>
          </div>
          {person.email && (
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <Mail size={14} className="text-ink-400" />
              <span className="font-medium text-ink-800">{person.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
            <BadgeIcon size={14} className="text-ink-400" />
            <span className="font-medium text-ink-800">{person.id}</span>
          </div>
          <Badge tone={person.status === "active" ? "active" : "cancelled"}>{person.status}</Badge>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-950 to-ink-800 p-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Conveyor Group Restaurant</p>
          <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-2">
            <QRCodeSVG value={qrValue} size={140} level="M" />
          </div>
          <p className="mt-3 text-sm font-bold">{person.name}</p>
        </div>
      </div>
    </div>
  );
}