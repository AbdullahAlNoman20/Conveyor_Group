import { useEffect, useRef, useState } from "react";
import { UserCog, Camera, Send } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB — sane client-side upload guard

export default function ClientProfile() {
  const { user } = useAuth();
  const { push } = useToast();
  const fileRef = useRef(null);

  const [clients, setClients] = useState(null);
  const [requests, setRequests] = useState(null);
  const [name, setName] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setRequests(await dataStore.load("profileRequests", "profile-requests.json"));
    })();
  }, []);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  if (!clients || !requests) return <Loader full label="Loading your profile..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const myPending = requests.find((r) => r.clientId === me?.id && r.status === "pending");

  function onPhotoChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push("Please choose an image file.", "error");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      push("Image is too large — please choose one under 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function submitRequest(e) {
    e.preventDefault();
    if (!name.trim()) {
      push("Name cannot be empty.", "error");
      return;
    }
    if (name.trim() === me?.name && !photoPreview) {
      push("Change the name or choose a new photo before submitting.", "info");
      return;
    }
    const record = {
      id: genId("PR"),
      clientId: me.id,
      clientName: me.name,
      requestedName: sanitizeText(name, 100),
      requestedPhoto: photoPreview,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const next = await dataStore.insert("profileRequests", record);
    setRequests(next);
    push("Profile change request submitted — waiting for Manager approval.", "success");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Profile</h1>
        <p className="text-sm text-ink-400">
          Changes to your name or photo need Manager approval before they apply.
        </p>
      </div>

      {myPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You have a profile change request <Badge tone="pending">pending</Badge> approval — submitted{" "}
          {new Date(myPending.createdAt).toLocaleDateString()}.
        </div>
      )}

      <form onSubmit={submitRequest} className="space-y-4 rounded-xl border border-ink-100 bg-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-2xl font-bold text-ink-400">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                me?.name?.charAt(0)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full bg-brand-600 p-1.5 text-white hover:bg-brand-700"
              aria-label="Change profile photo"
            >
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChosen} />
          </div>
          <p className="text-xs text-ink-400">JPG or PNG, under 2MB</p>
        </div>

        <FormField label="Full Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3 text-sm text-ink-500">
          <div>
            <p className="text-xs text-ink-400">Employee ID</p>
            <p className="font-medium text-ink-800">{me?.employeeId}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Department</p>
            <p className="font-medium text-ink-800">{me?.department}</p>
          </div>
        </div>

        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Send size={16} /> Submit for Approval
        </button>
      </form>
    </div>
  );
}
