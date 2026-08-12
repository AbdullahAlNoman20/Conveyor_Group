// FILE: src/pages/modules/super-admin/pages/RegistrationArchive.jsx (NEW)
import { useEffect, useState } from "react";
import { Eye, Printer, Mail } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import Button from "../../../../components/shared/Button";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function RegistrationArchive() {
  const [emails, setEmails] = useState(null);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    (async () => setEmails(await dataStore.load("registrationEmails", "registration-emails.json")))();
  }, []);

  // usePagination is a hook — it MUST run on every render in the same
  // order, so it cannot sit after a conditional early return. Feed it a
  // safe empty array while `emails` is still loading; the Loader below
  // still gates what actually renders.
  const safeEmails = emails || [];
  const sorted = [...safeEmails].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const filtered = sorted.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.email.toLowerCase().includes(query.toLowerCase())
  );
  const { page, setPage, totalPages, pageItems } = usePagination(filtered, 10);

  if (!emails) return <Loader full label="Loading registration archive..." />;

  function printRecord(record) {
    printOnLetterhead({
      title: `Welcome Email — ${record.name}`,
      bodyHtml: record.bodyHtml,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Registration Email Archive</h1>
          <p className="text-sm text-ink-400">
            A saved copy of every welcome email sent on account creation. View or print any copy.
          </p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or email..." />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Sent At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pageItems.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{r.name}</td>
                <td className="px-4 py-3 text-ink-500">{r.email}</td>
                <td className="px-4 py-3 text-ink-500">{r.role}</td>
                <td className="px-4 py-3 text-ink-500">{new Date(r.sentAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="icon" title="View" onClick={() => setViewing(r)}>
                      <Eye size={14} />
                    </Button>
                    <Button variant="icon" title="Print" onClick={() => printRecord(r)}>
                      <Printer size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                  No registration emails archived yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Welcome Email — Archived Copy" size="md">
        {viewing && (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
              <Mail size={14} />
              To: <span className="font-medium text-ink-800">{viewing.email}</span> — Sent{" "}
              {new Date(viewing.sentAt).toLocaleString()}
            </div>
            <div
              className="rounded-xl border border-ink-200 p-5 text-sm text-ink-700"
              dangerouslySetInnerHTML={{ __html: viewing.bodyHtml }}
            />
            <Button variant="primary" icon={Printer} onClick={() => printRecord(viewing)} fullWidth className="mt-4">
              Print
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}