// admin/src/pages/modules/client/pages/ClientQRCard.jsx
import { useEffect, useState } from "react";
import { Printer, ShieldCheck, Utensils, UserRound } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import IdCard from "../../../../components/shared/IdCard";
import PrintArea from "../../../../components/shared/PrintArea";
import Loader from "../../../../components/shared/Loader";

export default function ClientQRCard() {
  const { push } = useToast();
  const [me, setMe] = useState(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiGet("/clients/me")
      .then((data) => mounted && setMe(data))
      .catch((err) => {
        if (mounted) push(err?.message || "Could not load your card.", "error");
      });
    return () => {
      mounted = false;
    };
  }, [push]);

  if (!me) return <Loader full label="Loading your card..." />;

  // The card's QR is permanent: it is printed once and used every day. A lost
  // card is killed by the Super Admin reissuing it, which changes this token.
  const card = {
    id: me.id,
    name: me.name,
    employeeId: me.employeeId,
    department: me.department,
    designation: me.designation,
    photo: me.photo,
    qrStatus: me.qrStatus,
    issuedOn: new Date(me.qrIssuedAt || Date.now()).toISOString().slice(0, 10),
    qrPayload: JSON.stringify({
      clientId: me.id,
      employeeId: me.employeeId,
      qrToken: me.qrToken,
    }),
  };

  if (printing) {
    return (
      <PrintArea onDone={() => setPrinting(false)}>
        <IdCard client={card} />
      </PrintArea>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">My Meal Card</h1>
        <p className="mt-1 text-sm text-ink-500">
          Show this QR at the counter to collect your meal.
        </p>
      </div>

      <IdCard client={card} />

      <div className="mx-auto w-full max-w-[380px]">
        <button
          onClick={() => setPrinting(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Printer size={16} /> Print or Save as PDF
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tip Icon={ShieldCheck} title="Keep it safe">
          Lost your card? Tell the Super Admin and they will issue a new one.
          The old card stops working at once.
        </Tip>
        <Tip Icon={Utensils} title="One meal a day">
          The card works once per day, inside the counter hours.
        </Tip>
        <Tip Icon={UserRound} title="Only yours">
          The card is linked to you. Someone else cannot use it.
        </Tip>
      </div>
    </div>
  );
}

function Tip({ Icon, title, children }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-ink-800">
        <Icon size={15} className="shrink-0 text-brand-600" />
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-ink-500">{children}</p>
    </div>
  );
}