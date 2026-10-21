// admin/src/pages/modules/super-admin/pages/AccessControl.jsx
import { useEffect, useState } from "react";
import { ShieldCheck, Check, X, RotateCcw, Users, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "../../../../components/services/api";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";
import AvatarImage from "../../../../components/shared/AvatarImage";

const ROLE_TONE = {
  super_admin: "cancelled",
  manager: "active",
  accounts: "confirmed",
};

/**
 * Grant or revoke individual capabilities on top of a role.
 *
 * Three states per permission, which is one more than a checkbox can express:
 * follow the role default, force on, force off. The difference matters — a
 * cleared override follows the role if the role later changes, an explicit
 * revoke does not.
 */
export default function AccessControl() {
  const { user } = useAuth();
  const { push } = useToast();

  const [catalogue, setCatalogue] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cat, list] = await Promise.all([
        apiGet("/permissions/catalogue").catch(() => null),
        apiGet("/permissions/staff").catch(() => []),
      ]);
      setCatalogue(cat);
      setStaff(list);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    apiGet(`/permissions/staff/${selectedId}`).then(setProfile).catch(() => setProfile(null));
  }, [selectedId]);

  if (loading) return <Loader full label="Loading access control..." />;

  async function change(permission, granted) {
    setSaving(permission);
    try {
      const next = await apiPost(`/permissions/staff/${selectedId}`, { permission, granted });
      setProfile(next);
      push(
        granted === null
          ? "Reset to the role default."
          : granted
            ? "Permission granted."
            : "Permission revoked.",
        "success",
      );
    } catch (err) {
      push(err?.message || "Couldn't change that permission.", "error");
    } finally {
      setSaving("");
    }
  }

  async function changeRole(role) {
    try {
      const next = await apiPost(`/permissions/staff/${selectedId}/role`, { role });
      setProfile(next);
      setStaff(await apiGet("/permissions/staff"));
      push("Role updated.", "success");
    } catch (err) {
      push(err?.message || "Couldn't change the role.", "error");
    }
  }

  const byKey = new Map((profile?.permissions ?? []).map((p) => [p.key, p]));

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Access Control</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-400">
          Each role comes with a default set of permissions. Grant or revoke
          individual ones here when someone needs to cover a duty outside their
          usual role.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Staff list */}
        <aside className="h-fit rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-700">
            <Users size={15} /> Staff ({staff.length})
          </h2>

          <div className="space-y-1">
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition ${
                  selectedId === s.id ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-ink-50"
                }`}
              >
                <AvatarImage name={s.name} size={32} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{s.name}</p>
                  <p className="truncate text-xs text-ink-400">{s.roleLabel}</p>
                </div>
                {s.id === user?.id && (
                  <span className="shrink-0 text-[10px] font-bold text-ink-400">YOU</span>
                )}
              </button>
            ))}

            {staff.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No staff accounts.</p>
            )}
          </div>
        </aside>

        {/* Permission grid */}
        <section className="min-w-0 rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          {!profile ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center">
              <ShieldCheck size={28} className="text-ink-300" />
              <p className="text-sm text-ink-400">
                Pick a staff member to review their access.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-ink-900">{profile.name}</h2>
                  <p className="truncate text-xs text-ink-400">{profile.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={ROLE_TONE[profile.role] ?? "pending"}>{profile.roleLabel}</Badge>

                  {/* Changing your own role is blocked server-side too — it's
                      the quickest way to lock yourself out. */}
                  {profile.userId !== user?.id && (
                    <select
                      value={profile.role}
                      onChange={(e) => changeRole(e.target.value)}
                      className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs outline-none focus:border-brand-500"
                    >
                      {(catalogue?.roles ?? []).map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-5">
                {(catalogue?.groups ?? []).map((group) => (
                  <div key={group.group}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                      {group.group}
                    </p>

                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const state = byKey.get(item.key);
                        if (!state) return null;
                        const isSaving = saving === item.key;

                        return (
                          <div
                            key={item.key}
                            className="flex min-w-0 flex-col gap-2 rounded-lg bg-ink-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink-800">{item.label}</p>
                              <p className="mt-0.5 text-xs leading-5 text-ink-400">
                                {item.description}
                              </p>
                              {state.override !== null && (
                                <p className="mt-1 text-[11px] font-semibold text-sky-700">
                                  Overridden — role default is{" "}
                                  {state.fromRole ? "allowed" : "not allowed"}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              {isSaving ? (
                                <Loader2 size={16} className="animate-spin text-ink-400" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => change(item.key, true)}
                                    title="Allow"
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                      state.effective
                                        ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                        : "border-ink-200 bg-white text-ink-400 hover:border-emerald-300"
                                    }`}
                                  >
                                    <Check size={14} />
                                  </button>

                                  <button
                                    onClick={() => change(item.key, false)}
                                    title="Deny"
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                      !state.effective
                                        ? "border-brand-300 bg-brand-100 text-brand-700"
                                        : "border-ink-200 bg-white text-ink-400 hover:border-brand-300"
                                    }`}
                                  >
                                    <X size={14} />
                                  </button>

                                  <button
                                    onClick={() => change(item.key, null)}
                                    disabled={state.override === null}
                                    title="Follow the role default"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400 transition hover:bg-ink-100 disabled:opacity-30"
                                  >
                                    <RotateCcw size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}