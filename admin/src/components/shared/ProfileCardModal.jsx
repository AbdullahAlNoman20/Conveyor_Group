// FILE: src/components/shared/ProfileCardModal.jsx  (NEW)
import { QRCodeSVG } from "qrcode.react";
import { Mail, Phone, Building2, Badge as BadgeIcon } from "lucide-react";
import Modal from "./Modal";
import Badge from "./Badge";
import AvatarImage from "./AvatarImage";

/**
 * Read-only "nicely laid out" profile view — SRS request: Super Admin should
 * be able to see a client/staff profile properly, not just an edit form.
 * Shows contact details plus a virtual ID card (QR + role) on one screen.
 */
export default function ProfileCardModal({ open, onClose, person, role, qrValue }) {
  if (!person) return null;

  return (
    <Modal open={open} onClose={onClose} title="Profile" size="md">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AvatarImage src={person.avatar} name={person.name} size={56} className="shrink-0" />
            <div>
              <p className="text-lg font-bold text-ink-900">{person.name}</p>
              <p className="text-xs text-ink-400">{person.designation || role}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {person.email && (
              <Row icon={Mail} label="Email" value={person.email} />
            )}
            {(person.phone || person.mobile) && (
              <Row icon={Phone} label="Phone" value={person.phone || person.mobile} />
            )}
            {person.department && <Row icon={Building2} label="Department" value={person.department} />}
            {person.employeeId && <Row icon={BadgeIcon} label="Employee ID" value={person.employeeId} />}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {person.employmentType && <Badge tone="active">{person.employmentType}</Badge>}
            {person.mealPlan && <Badge tone="pending">{person.mealPlan}</Badge>}
            {person.status && (
              <Badge tone={person.status === "active" ? "active" : "cancelled"}>{person.status}</Badge>
            )}
          </div>
        </div>

        {/* Virtual ID card */}
        <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-950 to-ink-800 p-5 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">
            Conveyor Group Restaurant
          </p>
          <p className="mt-0.5 text-[10px] text-ink-400">{role} ID Card</p>
          <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-2">
            <QRCodeSVG value={qrValue} size={120} level="M" />
          </div>
          <p className="mt-3 text-sm font-bold">{person.name}</p>
          <p className="text-xs text-ink-300">{person.employeeId || person.id}</p>
        </div>
      </div>
    </Modal>
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