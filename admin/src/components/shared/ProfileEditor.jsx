// FILE: src/components/shared/ProfileEditor.jsx (NEW)
import { useRef, useState } from "react";
import { Camera, Send } from "lucide-react";
import { apiPatch, uploadFile } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import FormField from "./FormField";
import AvatarImage from "./AvatarImage";
import PasswordChangeSection from "./PasswordChangeSection";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Self-service "Edit Profile" for Manager and Super Admin. Unlike Client
 * (who has a separate `clients` record linked via userId), these roles
 * ARE the `users` record directly — so this writes straight to `users`
 * by id. AuthContext already subscribes to `users` changes, so the
 * header/sidebar avatar and name update instantly, no re-login needed.
 */
export default function ProfileEditor({ roleLabel }) {
  const { user } = useAuth();
  const { push } = useToast();
  const fileRef = useRef(null);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoPath, setPhotoPath] = useState(null);
  const [saving, setSaving] = useState(false);

  const displayPhoto = photoPreview || user?.photo;

  async function onPhotoChosen(e) {
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

    // Preview locally; the bytes stream straight to Supabase Storage and only
    // the returned object path is stored on the record.
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);

    try {
      const { path } = await uploadFile("avatars", file);
      setPhotoPath(path);
    } catch (err) {
      setPhotoPreview(null);
      push(err?.message || "Upload failed. Please try again.", "error");
    }
  }

  async function saveProfile(e) {
    e.preventDefault();

    if (!photoPath) {
      push("Choose a new photo first.", "info");
      return;
    }

    setSaving(true);
    try {
      await apiPatch("/auth/me/photo", { photoPath });
      setPhotoPreview(null);
      setPhotoPath(null);
      window.dispatchEvent(new CustomEvent("cccms:profile-updated"));
      push("Profile photo updated.", "success");
    } catch (err) {
      push(err?.message || "Couldn't update your photo.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Profile</h1>
        <p className="text-sm text-ink-400">
          Update your photo any time — changes apply immediately.
        </p>
      </div>

      <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-ink-100 bg-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-ink-100">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <AvatarImage name={user?.name} size={96} />
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

        {/* Read-only for the same reason as clients: the display name is used
            across reports and audit records. */}
        <FormField label="Full Name">
          <div className="flex w-full items-center rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-600">
            {user?.name}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3 text-sm text-ink-500">
          <div>
            <p className="text-xs text-ink-400">Role</p>
            <p className="font-medium text-ink-800">{roleLabel}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Email</p>
            <p className="truncate font-medium text-ink-800">{user?.email}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !photoPath}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} /> {saving ? "Saving..." : "Save Photo"}
        </button>
      </form>

      <PasswordChangeSection />
    </div>
  );
}