import { useEffect, useRef, useState } from "react";
import { Camera, Send } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";
import AvatarImage from "../../../../components/shared/AvatarImage";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB — sane client-side upload guard

export default function ClientProfile() {
  const { user } = useAuth();
  const { push } = useToast();
  const fileRef = useRef(null);

  const [clients, setClients] = useState(null);
  const [name, setName] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
    })();
  }, []);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  if (!clients) return <Loader full label="Loading your profile..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const displayPhoto = photoPreview || me?.photo;

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

  // Client-controlled: no Manager approval needed — updates apply the
  // instant this is submitted, unlike the old profileRequests flow.
  async function saveProfile(e) {
    e.preventDefault();
    if (!name.trim()) {
      push("Name cannot be empty.", "error");
      return;
    }
    setSaving(true);
    const patch = { name: sanitizeText(name, 100) };
    if (photoPreview) patch.photo = photoPreview;

    const next = await dataStore.update("clients", (c) => c.id === me.id, patch);
    setClients(next);
    setSaving(false);
    setPhotoPreview(null);
    push("Profile updated.", "success");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Profile</h1>
        <p className="text-sm text-ink-400">
          Update your name or photo any time — changes apply immediately, no approval needed.
        </p>
      </div>

      <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-ink-100 bg-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-ink-100">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <AvatarImage name={me?.name} size={96} />
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

        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}