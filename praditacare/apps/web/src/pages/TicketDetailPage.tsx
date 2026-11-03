import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FormatDateTime,
  GetRemainingText,
  ReopenWindowDays,
  StatusesRequiringNote,
  TicketPriorityLabels,
  TicketPriorityValues,
  TicketStatusLabels,
  TicketStatusTransitions,
  UploadLimits,
  type Category,
  type Ticket,
  type TicketAttachment,
  type TicketComment,
  type TicketPriority,
  type TicketStatus,
  type TicketStatusHistory,
  type User
} from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { UseAuth } from "../auth/AuthContext";
import { PriorityText, SlaBadge, StatusBadge } from "../components/Badges";
import { Alert, ConfirmDialog, FieldError, Spinner } from "../components/Ui";

type TimelineItem = { Kind: "comment"; At: string; Comment: TicketComment } | { Kind: "status"; At: string; History: TicketStatusHistory };

type PendingAction =
  | { Kind: "status"; Status: TicketStatus }
  | { Kind: "priority"; Priority: TicketPriority }
  | { Kind: "assign"; AssigneeId: number | null }
  | { Kind: "category"; CategoryId: number }
  | { Kind: "reopen" };

function Attachments({ Items }: { Items: TicketAttachment[] }) {
  if (!Items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {Items.map((a) => (
        <button
          key={a.Id}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
          onClick={() => Api.Download(`/attachments/${a.Id}/download`, a.FileName).catch((e) => alert(e.message))}
        >
          📎 {a.FileName} <span className="text-slate-400">({Math.ceil(a.SizeBytes / 1024)} KB)</span>
        </button>
      ))}
    </div>
  );
}

function InfoRow({ Label, children }: { Label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{Label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export function TicketDetailPage() {
  const { Id } = useParams();
  const { User } = UseAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [history, setHistory] = useState<TicketStatusHistory[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionErrors, setActionErrors] = useState<Record<string, string[]>>();
  const [busy, setBusy] = useState(false);

  const isHandler = User?.Role === "STAFF" || User?.Role === "ADMIN";

  const Load = useCallback(async () => {
    try {
      const t = await Api.Get<Ticket>(`/tickets/${Id}`);
      setTicket(t);
      const [h, c] = await Promise.all([
        Api.Get<TicketStatusHistory[]>(`/tickets/${Id}/history`),
        t.IsContentHidden ? Promise.resolve([]) : Api.Get<TicketComment[]>(`/tickets/${Id}/comments`)
      ]);
      setHistory(h);
      setComments(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat tiket");
    }
  }, [Id]);

  useEffect(() => {
    Load();
  }, [Load]);

  useEffect(() => {
    if (!isHandler || !ticket) return;
    Api.Get<User[]>(`/tickets/${ticket.Id}/assignees`).then(setAssignees).catch(() => setAssignees([]));
    Api.Get<Category[]>("/categories").then(setCategories).catch(() => setCategories([]));
  }, [isHandler, ticket?.Id, ticket?.UnitId]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...comments.map((c) => ({ Kind: "comment" as const, At: c.CreatedAt, Comment: c })),
      ...history.map((h) => ({ Kind: "status" as const, At: h.CreatedAt, History: h }))
    ];
    return items.sort((a, b) => a.At.localeCompare(b.At));
  }, [comments, history]);

  if (error && !ticket) return <Alert>{error}</Alert>;
  if (!ticket || !User) return <Spinner />;

  const isFinal = ticket.Status === "CLOSED" || ticket.Status === "REJECTED";
  const isReporter = ticket.IsMine;
  const isActive = !["RESOLVED", "CLOSED", "REJECTED"].includes(ticket.Status);
  const canReopen =
    isReporter && ticket.Status === "RESOLVED" && !!ticket.ResolvedAt && Date.now() - Date.parse(ticket.ResolvedAt) <= ReopenWindowDays * 86400000;

  function OpenAction(action: PendingAction) {
    setActionNote("");
    setActionErrors(undefined);
    setPending(action);
  }

  async function RunAction() {
    if (!pending || !ticket) return;
    setBusy(true);
    setActionErrors(undefined);
    try {
      let updated: Ticket;
      if (pending.Kind === "status") updated = await Api.Send("PUT", `/tickets/${ticket.Id}/status`, { Status: pending.Status, Note: actionNote || null });
      else if (pending.Kind === "priority") updated = await Api.Send("PUT", `/tickets/${ticket.Id}/priority`, { Priority: pending.Priority });
      else if (pending.Kind === "assign") updated = await Api.Send("PUT", `/tickets/${ticket.Id}/assign`, { AssigneeId: pending.AssigneeId });
      else if (pending.Kind === "category") updated = await Api.Send("PUT", `/tickets/${ticket.Id}/category`, { CategoryId: pending.CategoryId, Note: actionNote || null });
      else updated = await Api.Send("POST", `/tickets/${ticket.Id}/reopen`, { Note: actionNote });
      setTicket(updated);
      setPending(null);
      setNotice("Perubahan berhasil disimpan.");
      await Load();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionErrors(err.Errors ?? { _: [err.message] });
      }
    } finally {
      setBusy(false);
    }
  }

  const needsNote = pending?.Kind === "status" ? StatusesRequiringNote.includes(pending.Status) : pending?.Kind === "reopen";
  const showNote = pending?.Kind === "status" || pending?.Kind === "category" || pending?.Kind === "reopen";
  const dialogTitle =
    pending?.Kind === "status"
      ? `Ubah status menjadi ${TicketStatusLabels[pending.Status]}?`
      : pending?.Kind === "priority"
        ? `Ubah prioritas menjadi ${TicketPriorityLabels[pending.Priority]}?`
        : pending?.Kind === "assign"
          ? "Ubah petugas tiket?"
          : pending?.Kind === "category"
            ? "Pindahkan kategori tiket?"
            : "Buka kembali tiket?";

  return (
    <div className="space-y-5">
      <Link to={isHandler ? "/antrian" : "/tiket-saya"} className="text-sm text-brand-600 hover:underline">
        ← Kembali
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate-500">{ticket.TicketNumber}</span>
          <StatusBadge Status={ticket.Status} />
          <SlaBadge Status={ticket.SlaStatus} />
          {ticket.IsConfidential && <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-white">Rahasia</span>}
          {ticket.IsAnonymous && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">Anonim</span>}
        </div>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">{ticket.Title ?? "Isi tiket rahasia disembunyikan"}</h1>
        {isActive && (
          <p className={`mt-1 text-sm ${ticket.SlaStatus === "OVERDUE" ? "font-medium text-red-600" : "text-slate-500"}`}>
            {GetRemainingText(ticket.DueAt)} (batas {FormatDateTime(ticket.DueAt)})
          </p>
        )}
        {ticket.IsContentHidden ? (
          <div className="mt-4">
            <Alert Kind="info">Tiket ini termasuk kategori rahasia. Admin hanya dapat melihat nomor, status, dan SLA.</Alert>
          </div>
        ) : (
          <>
            {ticket.Location && (
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Lokasi:</span> {ticket.Location}
              </p>
            )}
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{ticket.Description}</p>
            <Attachments Items={ticket.Attachments} />
          </>
        )}
      </div>

      {notice && <Alert Kind="success">{notice}</Alert>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Timeline</h2>
            <ol className="space-y-4">
              {timeline.map((item) =>
                item.Kind === "status" ? (
                  <li key={`h${item.History.Id}`} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    <div>
                      <p className="text-slate-700">
                        <span className="font-medium">{item.History.ChangedByName}</span>{" "}
                        {item.History.FromStatus ? "mengubah status menjadi" : "membuat tiket dengan status"}{" "}
                        <StatusBadge Status={item.History.ToStatus} />
                      </p>
                      {item.History.Note && <p className="mt-1 text-slate-500">“{item.History.Note}”</p>}
                      <p className="text-xs text-slate-400">{FormatDateTime(item.History.CreatedAt)}</p>
                    </div>
                  </li>
                ) : (
                  <li key={`c${item.Comment.Id}`} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {item.Comment.AuthorName.charAt(0)}
                    </span>
                    <div className={`flex-1 rounded-lg px-4 py-3 ${item.Comment.IsInternal ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-800">{item.Comment.AuthorName}</span>
                        <span className="text-slate-400">{FormatDateTime(item.Comment.CreatedAt)}</span>
                        {item.Comment.IsInternal && <span className="rounded bg-amber-200 px-1.5 py-0.5 font-medium text-amber-900">Catatan internal</span>}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{item.Comment.Body}</p>
                      <Attachments Items={item.Comment.Attachments} />
                    </div>
                  </li>
                )
              )}
            </ol>
            {!ticket.IsContentHidden && !isFinal && <CommentForm Ticket={ticket} IsHandler={isHandler} OnPosted={Load} />}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-2 font-semibold text-slate-900">Informasi</h2>
            <dl className="divide-y divide-slate-100">
              <InfoRow Label="Kategori">{ticket.CategoryName}</InfoRow>
              <InfoRow Label="Unit">{ticket.UnitName}</InfoRow>
              <InfoRow Label="Pelapor">{ticket.ReporterName}</InfoRow>
              <InfoRow Label="Petugas">{ticket.AssigneeName ?? "Belum ditugaskan"}</InfoRow>
              <InfoRow Label="Prioritas">
                <PriorityText Priority={ticket.Priority} />
              </InfoRow>
              <InfoRow Label="Dibuat">{FormatDateTime(ticket.CreatedAt)}</InfoRow>
              <InfoRow Label="Batas SLA">{FormatDateTime(ticket.DueAt)}</InfoRow>
              <InfoRow Label="Respons pertama">{FormatDateTime(ticket.FirstResponseAt)}</InfoRow>
              <InfoRow Label="Selesai">{FormatDateTime(ticket.ResolvedAt)}</InfoRow>
            </dl>
          </div>

          {isHandler && !isFinal && (
            <div className="card space-y-4 p-5">
              <h2 className="font-semibold text-slate-900">Tindakan</h2>
              {TicketStatusTransitions[ticket.Status].length > 0 && (
                <div>
                  <p className="label">Ubah status</p>
                  <div className="flex flex-wrap gap-2">
                    {TicketStatusTransitions[ticket.Status].map((s) => (
                      <button
                        key={s}
                        className={s === "REJECTED" ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
                        onClick={() => OpenAction({ Kind: "status", Status: s })}
                      >
                        {TicketStatusLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="label">Petugas</label>
                <select
                  className="input"
                  value={ticket.AssigneeId ?? ""}
                  onChange={(e) => OpenAction({ Kind: "assign", AssigneeId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Belum ditugaskan</option>
                  {assignees.map((u) => (
                    <option key={u.Id} value={u.Id}>
                      {u.Name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Prioritas</label>
                <select className="input" value={ticket.Priority} onChange={(e) => OpenAction({ Kind: "priority", Priority: e.target.value as TicketPriority })}>
                  {TicketPriorityValues.map((p) => (
                    <option key={p} value={p}>
                      {TicketPriorityLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Pindah kategori</label>
                <select className="input" value={ticket.CategoryId} onChange={(e) => OpenAction({ Kind: "category", CategoryId: Number(e.target.value) })}>
                  {categories.map((c) => (
                    <option key={c.Id} value={c.Id}>
                      {c.Name} ({c.UnitName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isReporter && ticket.Status === "RESOLVED" && (
            <div className="card space-y-4 p-5">
              <h2 className="font-semibold text-slate-900">Tiket sudah diselesaikan</h2>
              <p className="text-sm text-slate-500">Beri penilaian untuk menutup tiket, atau buka kembali bila masalah belum tuntas.</p>
              <FeedbackForm Ticket={ticket} OnDone={Load} />
              {canReopen && (
                <button className="btn-secondary w-full" onClick={() => OpenAction({ Kind: "reopen" })}>
                  Buka Kembali
                </button>
              )}
            </div>
          )}

          {ticket.Feedback && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900">Penilaian</h2>
              <p className="mt-2 text-lg text-amber-500">{"★".repeat(ticket.Feedback.Rating) + "☆".repeat(5 - ticket.Feedback.Rating)}</p>
              {ticket.Feedback.Comment && <p className="mt-1 text-sm text-slate-600">{ticket.Feedback.Comment}</p>}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        Open={!!pending}
        Title={dialogTitle}
        Message={
          pending?.Kind === "category"
            ? "Tiket akan diteruskan ke unit kategori baru. Batas SLA tidak berubah."
            : pending?.Kind === "reopen"
              ? "Tiket akan kembali berstatus Diproses."
              : "Perubahan ini akan tercatat di riwayat tiket."
        }
        Danger={pending?.Kind === "status" && pending.Status === "REJECTED"}
        Busy={busy}
        OnCancel={() => setPending(null)}
        OnConfirm={RunAction}
      >
        {actionErrors?._ && <Alert>{actionErrors._[0]}</Alert>}
        {showNote && (
          <div>
            <label className="label">{needsNote ? "Catatan (wajib)" : "Catatan (opsional)"}</label>
            <textarea className="input min-h-24" value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
            <FieldError Errors={actionErrors} Name="Note" />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

function CommentForm({ Ticket, IsHandler, OnPosted }: { Ticket: Ticket; IsHandler: boolean; OnPosted: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  async function Submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setError("Komentar wajib diisi");
    if (files.length > UploadLimits.MaxFilesPerUpload) return setError("Maksimal 5 file per unggahan");
    const form = new FormData();
    form.append("Body", body);
    form.append("IsInternal", String(isInternal));
    files.forEach((f) => form.append("Files", f));
    setBusy(true);
    setError(null);
    try {
      await Api.Send("POST", `/tickets/${Ticket.Id}/comments`, form);
      setBody("");
      setFiles([]);
      setIsInternal(false);
      setInputKey((k) => k + 1);
      await OnPosted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim komentar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={Submit} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
      {error && <Alert>{error}</Alert>}
      {Ticket.IsMine && Ticket.Status === "WAITING_REPORTER" && (
        <Alert Kind="info">Petugas menunggu balasan Anda. Membalas akan mengembalikan tiket ke status Diproses.</Alert>
      )}
      <textarea className="input min-h-24" placeholder="Tulis komentar..." value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            key={inputKey}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            className="text-xs"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {IsHandler && (
            <label className="flex items-center gap-2 text-sm text-amber-800">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Catatan internal
            </label>
          )}
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Mengirim..." : "Kirim"}
        </button>
      </div>
    </form>
  );
}

function FeedbackForm({ Ticket, OnDone }: { Ticket: Ticket; OnDone: () => Promise<void> }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function Submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Pilih rating 1 sampai 5");
    setBusy(true);
    try {
      await Api.Send("POST", `/tickets/${Ticket.Id}/feedback`, { Rating: rating, Comment: comment || null });
      await OnDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim penilaian");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={Submit} className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} className={`text-3xl ${n <= rating ? "text-amber-400" : "text-slate-300"}`}>
            ★
          </button>
        ))}
      </div>
      <textarea className="input" placeholder="Komentar (opsional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Mengirim..." : "Kirim Penilaian & Tutup Tiket"}
      </button>
    </form>
  );
}
