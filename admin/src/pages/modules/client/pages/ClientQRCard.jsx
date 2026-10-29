// admin/src/pages/modules/client/pages/ClientQRCard.jsx
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Utensils, Smartphone } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import IdCard from "../../../../components/shared/IdCard";
import PrintArea from "../../../../components/shared/PrintArea";
import CardDownloadButtons from "../../../../components/shared/CardDownloadButtons";
import Loader from "../../../../components/shared/Loader";

export default function ClientQRCard() {
  const { push } = useToast();
  const cardRef = useRef(null);
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

  // Permanent QR. A lost card is stopped by reissuing it, which changes the token.
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
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">My Meal Card</h1>
        <p className="mt-1 text-sm text-ink-500">
          Show this QR at the counter to collect your meal. You can also save it
          on your phone as an image or PDF.
        </p>
      </div>

      <div ref={cardRef} className="w-full">
        <IdCard client={card} />
      </div>

      <CardDownloadButtons
        targetRef={cardRef}
        fileName={`meal-card-${me.employeeId}`}
        renderCard={() => <IdCard client={card} />}
        onPrint={() => setPrinting(true)}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Tip Icon={ShieldCheck} title="Keep it safe">
          Lost your card? Tell the Super Admin and they will issue a new one.
          The old card stops working at once.
        </Tip>
        <Tip Icon={Utensils} title="One meal a day">
          The card works once a day, while the counter is open.
        </Tip>
        <Tip Icon={Smartphone} title="On your phone">
          Save the image and show it from your gallery if you forget the card.
        </Tip>
      </div>
    </div>
  );
}

function Tip({ Icon, title, children }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
        <Icon size={15} className="shrink-0 text-brand-600" /> {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-ink-500">{children}</p>
    </div>
  );
}