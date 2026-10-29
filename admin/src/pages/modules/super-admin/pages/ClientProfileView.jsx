// admin/src/pages/modules/super-admin/pages/ClientProfileView.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Phone, Building2, BadgeCheck, Wallet, AlertTriangle, Lock,
} from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { useAuth } from "../../../../components/hooks/useAuth";
import { usePermission } from "../../../../components/hooks/usePermission";
import { PERMISSIONS } from "../../../../components/constants/roles";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import IdCard from "../../../../components/shared/IdCard";
import PrintArea from "../../../../components/shared/PrintArea";
import CardDownloadButtons from "../../../../components/shared/CardDownloadButtons";

export default function ClientProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermission();

  const [person, setPerson] = useState(null);
  const [card, setCard] = useState(null);
  const [cardError, setCardError] = useState("");
  const [missing, setMissing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const cardRef = useRef(null);

  const allowedCard = can(PERMISSIONS.CLIENT_MANAGE);

  // Same screen under three roles, so the back link follows the role.
  const base =
    user?.role === "manager"
      ? "/app/manager"
      : user?.role === "accounts"
        ? "/app/accounts"
        : "/app/super-admin";

  useEffect(() => {
    let mounted = true;

    apiGet(`/clients/${id}`)
      .then((data) => mounted && setPerson(data))
      .catch(() => mounted && setMissing(true));

    // The card carries the QR token, so it is fetched only when allowed.
    if (allowedCard) {
      apiGet(`/clients/id-cards?ids=${encodeURIComponent(id)}`)
        .then((rows) => {
          if (!mounted) return;
          const row = rows?.[0];
          if (row) setCard(row);
          else setCardError("No card has been issued for this employee yet.");
        })
        .catch((err) => {
          if (mounted) setCardError(err?.message || "Could not load the card.");
        });
    }

    return () => {
      mounted = false;
    };
  }, [id, allowedCard]);

  if (missing) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(`${base}/clients`)}
          className="flex items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
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
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <button
        type="button"
        onClick={() => navigate(`${base}/clients`)}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Employees
      </button>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* Profile */}
        <div className="min-w-0 space-y-3 rounded-2xl border border-ink-100 bg-white p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarImage name={person.name} photo={person.photo} size={56} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink-900">{person.name}</p>
              <p className="truncate text-xs text-ink-500">{person.designation || "Employee"}</p>
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

        {/* Card */}
        <div className="min-w-0 space-y-3">
          {card ? (
            <>
              <div ref={cardRef} className="w-full">
                <IdCard client={card} />
              </div>
              <CardDownloadButtons
                targetRef={cardRef}
                fileName={`meal-card-${card.employeeId}`}
                renderCard={() => <IdCard client={card} />}
                onPrint={() => setPrinting(true)}
              />
            </>
          ) : (
            <CardPlaceholder allowed={allowedCard} error={cardError} />
          )}
        </div>
      </div>
    </div>
  );
}

function CardPlaceholder({ allowed, error }) {
  if (!allowed) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 p-6 text-center">
        <Lock size={22} className="text-ink-300" />
        <p className="text-sm text-ink-400">You do not have access to this employee's card.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle size={22} className="text-amber-500" />
        <p className="text-sm leading-5 text-amber-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-ink-200 p-6">
      <Loader label="Loading the card..." />
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