import { useEffect, type ReactNode } from "react";

export function Spinner({ Label = "Memuat..." }: { Label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {Label}
    </div>
  );
}

export function EmptyState({ Title, Description, Action }: { Title: string; Description?: string; Action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-600">✓</div>
      <p className="font-medium text-slate-800">{Title}</p>
      {Description && <p className="max-w-sm text-sm text-slate-500">{Description}</p>}
      {Action && <div className="mt-3">{Action}</div>}
    </div>
  );
}

export function Alert({ Kind = "error", children }: { Kind?: "error" | "success" | "info"; children: ReactNode }) {
  const colors = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-brand-100 bg-brand-50 text-brand-900"
  }[Kind];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${colors}`}>{children}</div>;
}

export function FieldError({ Errors, Name }: { Errors?: Record<string, string[]>; Name: string }) {
  const messages = Errors?.[Name];
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

interface ModalProps {
  Open: boolean;
  Title: string;
  OnClose: () => void;
  children: ReactNode;
  Footer?: ReactNode;
}

export function Modal({ Open, Title, OnClose, children, Footer }: ModalProps) {
  useEffect(() => {
    if (!Open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && OnClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [Open, OnClose]);
  if (!Open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={OnClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{Title}</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {Footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{Footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  Open: boolean;
  Title: string;
  Message: ReactNode;
  ConfirmLabel?: string;
  Danger?: boolean;
  Busy?: boolean;
  OnConfirm: () => void;
  OnCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Modal
      Open={props.Open}
      Title={props.Title}
      OnClose={props.OnCancel}
      Footer={
        <>
          <button className="btn-secondary" onClick={props.OnCancel} disabled={props.Busy}>
            Batal
          </button>
          <button className={props.Danger ? "btn-danger" : "btn-primary"} onClick={props.OnConfirm} disabled={props.Busy}>
            {props.Busy ? "Memproses..." : props.ConfirmLabel ?? "Ya, lanjutkan"}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        <div>{props.Message}</div>
        {props.children}
      </div>
    </Modal>
  );
}

export function Pagination({ Page, TotalPages, OnChange }: { Page: number; TotalPages: number; OnChange: (page: number) => void }) {
  if (TotalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        Halaman {Page} dari {TotalPages}
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={Page <= 1} onClick={() => OnChange(Page - 1)}>
          Sebelumnya
        </button>
        <button className="btn-secondary btn-sm" disabled={Page >= TotalPages} onClick={() => OnChange(Page + 1)}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export function StatCard({ Label, Value, Hint, Tone = "default" }: { Label: string; Value: ReactNode; Hint?: string; Tone?: "default" | "danger" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{Label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${Tone === "danger" ? "text-red-600" : "text-slate-900"}`}>{Value}</p>
      {Hint && <p className="mt-1 text-xs text-slate-400">{Hint}</p>}
    </div>
  );
}
