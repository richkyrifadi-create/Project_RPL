import { useEffect, useState } from "react";
import { UnitSchema, type Unit } from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { Alert, ConfirmDialog, EmptyState, FieldError, Modal, Spinner } from "../components/Ui";

const Empty = { Code: "", Name: "", Email: "" };

export function AdminUnitsPage() {
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [editing, setEditing] = useState<Unit | null | "new">(null);
  const [form, setForm] = useState(Empty);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [toggle, setToggle] = useState<Unit | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const Load = () => Api.Get<Unit[]>("/units", { IncludeInactive: true }).then(setUnits);
  useEffect(() => {
    Load();
  }, []);

  function Open(unit: Unit | "new") {
    setForm(unit === "new" ? Empty : { Code: unit.Code, Name: unit.Name, Email: unit.Email });
    setErrors(undefined);
    setEditing(unit);
  }

  async function Save() {
    const parsed = UnitSchema.safeParse(form);
    if (!parsed.success) return setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    setBusy(true);
    try {
      if (editing === "new") await Api.Send("POST", "/units", parsed.data);
      else if (editing) await Api.Send("PUT", `/units/${editing.Id}`, { ...parsed.data, IsActive: editing.IsActive });
      setEditing(null);
      setMessage("Unit berhasil disimpan.");
      await Load();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.Errors ?? { Code: [err.message] });
    } finally {
      setBusy(false);
    }
  }

  async function ToggleActive() {
    if (!toggle) return;
    setBusy(true);
    try {
      await Api.Send("PUT", `/units/${toggle.Id}`, { Code: toggle.Code, Name: toggle.Name, Email: toggle.Email, IsActive: !toggle.IsActive });
      setToggle(null);
      await Load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Manajemen Unit</h1>
        <button className="btn-primary" onClick={() => Open("new")}>
          + Tambah Unit
        </button>
      </div>
      {message && <Alert Kind="success">{message}</Alert>}
      <div className="card overflow-x-auto">
        {!units ? (
          <Spinner />
        ) : units.length === 0 ? (
          <EmptyState Title="Belum ada unit" />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.Id}>
                  <td className="font-mono text-xs">{u.Code}</td>
                  <td className="font-medium">{u.Name}</td>
                  <td>{u.Email}</td>
                  <td>
                    <ActiveBadge Active={u.IsActive} />
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => Open(u)}>
                      Edit
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => setToggle(u)}>
                      {u.IsActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        Open={editing !== null}
        Title={editing === "new" ? "Tambah Unit" : "Edit Unit"}
        OnClose={() => setEditing(null)}
        Footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Batal
            </button>
            <button className="btn-primary" onClick={Save} disabled={busy}>
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {(["Code", "Name", "Email"] as const).map((key) => (
            <div key={key}>
              <label className="label">{{ Code: "Kode", Name: "Nama unit", Email: "Email unit" }[key]}</label>
              <input className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              <FieldError Errors={errors} Name={key} />
            </div>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        Open={!!toggle}
        Title={toggle?.IsActive ? "Nonaktifkan unit?" : "Aktifkan unit?"}
        Message={toggle?.IsActive ? "Kategori unit ini tidak akan tampil untuk tiket baru." : "Unit akan aktif kembali."}
        Danger={toggle?.IsActive}
        Busy={busy}
        OnCancel={() => setToggle(null)}
        OnConfirm={ToggleActive}
      />
    </div>
  );
}

export function ActiveBadge({ Active }: { Active: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${Active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
      {Active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
