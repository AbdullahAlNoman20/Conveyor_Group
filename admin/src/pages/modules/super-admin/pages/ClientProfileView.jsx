// admin/src/pages/modules/super-admin/pages/ClientProfileView.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building2, BadgeCheck, Printer, Wallet } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { useAuth } from "../../../../components/hooks/useAuth";
import { usePermission } from "../../../../components/hooks/usePermission";
import { PERMISSIONS } from "../../../../components/constants/roles";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import IdCard from "../../../../components/shared/IdCard";
import PrintArea from "../../../../components/shared/PrintArea";

export default function ClientProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermission();

  const [person, setPerson] = useState(null);
  const [card, setCard] = useState(null);
  const [missing, setMissing] = useState(false);
  const [printing, setPrinting] = useState(false);

  // The list every role can see, and the card data only staff who manage
  // employees may fetch. Keeping them separate means a viewer still gets the
  // profile even when they are not allowed the card's QR token.
  const base = user?.role === "manager" ? "/app/manager" : "/app/super-admin";

  useEffect(() => {
    let mounted = true;

    apiGet(`/clients/${id}`)
      .then((data) => mounted && setPerson(data))
      .catch(() => mounted && setMissing(true));

    if (can(PERMISSIONS.CLIENT_MANAGE)) {
      apiGet(`/clients/id-cards?ids=${id}`)
        .then((rows) => mounted && setCard(rows?.[0] ?? null))
        .catch(() => undefined);
    }

    return () => {
      mounted = false;
    };
  }, [id, can]);

  if (missing) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(`${base}/clients`)}
          className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          Employee not found.
        </p>
      </div>
    );
  }

  if (!person) return <Loader full label="Loading profile..." />;

  if (printing && card) {
    return (
      <PrintArea onDone={() => setPrinting(false)}>
        <IdCard client={card} />
      </PrintArea>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`${base}/clients`)}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Employees
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarImage name={person.name} photo={person.photo} size={56} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink-900">{person.name}</p>
              <p className="truncate text-xs text-ink-400">{person.designation || "Employee"}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-sm">
            {person.email && <Row icon={Mail} label="Email" value={person.email} />}
            {person.phone && <Row icon={Phone} label="Phone" value={person.phone} />}
            {person.department && <Row icon={Building2} label="Department" value={person.department} />}
            <Row icon={BadgeCheck} label="Employee ID" value={person.employeeId} />
            <Row icon={Wallet} label="Outstanding Due" value={`Tk ${person.monthlyBill ?? 0}`} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {person.employmentType && <Badge tone="active">{person.employmentType}</Badge>}
            <Badge tone="pending">{person.mealBenefit}</Badge>
            <Badge tone={person.status === "active" ? "active" : "cancelled"}>{person.status}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          {card ? (
            <>
              <IdCard client={card} />
              <button
                onClick={() => setPrinting(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Printer size={15} /> Print this card
              </button>
            </>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
              {can(PERMISSIONS.CLIENT_MANAGE)
                ? "Loading the card..."
                : "You do not have access to this employee's card."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
      <Icon size={14} className="shrink-0 text-ink-400" />
      <div className="min-w-0">
        <p className="text-[11px] text-ink-400">{label}</p>
        <p className="truncate font-medium text-ink-800">{value}</p>
      </div>
    </div>
  );
}