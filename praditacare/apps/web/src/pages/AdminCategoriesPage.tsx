import { useEffect, useState } from "react";
import { CategorySchema, type Category, type Unit } from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { Alert, ConfirmDialog, EmptyState, ErrorMessage, ErrorState, FieldError, Modal, Spinner } from "../components/Ui";
import { ActiveBadge } from "./AdminUnitsPage";

interface FormState {
  UnitId: string;
  Name: string;
  Description: string;
  SlaHours: string;
  IsConfidential: boolean;
  RequiresLocation: boolean;
}

const Empty: FormState = { UnitId: "", Name: "", Description: "", SlaHours: "24", IsConfidential: false, RequiresLocation: false };

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [editing, setEditing] = useState<Category | null | "new">(null);
  const [form, setForm] = useState<FormState>(Empty);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [toggle, setToggle] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const Load = () => {
    setLoadError(null);
    return Promise.all([
      Api.Get<Category[]>("/categories", { IncludeInactive: true }),
      Api.Get<Unit[]>("/units", { IncludeInactive: true })
    ])
      .then(([c, u]) => {
        setCategories(c);
        setUnits(u);
      })
      .catch((err) => setLoadError(ErrorMessage(err, "Gagal memuat kategori")));
  };
  useEffect(() => {
    Load();
  }, []);

  function Open(category: Category | "new") {
    setForm(
      category === "new"
        ? Empty
        : {
            UnitId: String(category.UnitId),
            Name: category.Name,
            Description: category.Description,
            SlaHours: String(category.SlaHours),
            IsConfidential: category.IsConfidential,
            RequiresLocation: category.RequiresLocation
          }
    );
    setErrors(undefined);
    setEditing(category);
  }

  async function Save() {
    const parsed = CategorySchema.safeParse(form);
    if (!parsed.success) return setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    setBusy(true);
    try {
      if (editing === "new") await Api.Send("POST", "/categories", parsed.data);
      else if (editing) await Api.Send("PUT", `/categories/${editing.Id}`, { ...parsed.data, IsActive: editing.IsActive });
      setEditing(null);
      setMessage("Kategori berhasil disimpan.");
      await Load();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.Errors ?? { Name: [err.message] });
    } finally {
      setBusy(false);
    }
  }

  async function ToggleActive() {
    if (!toggle) return;
    setBusy(true);
    try {
      const { UnitId, Name, Description, SlaHours, IsConfidential, RequiresLocation, IsActive } = toggle;
      await Api.Send("PUT", `/categories/${toggle.Id}`, { UnitId, Name, Description, SlaHours, IsConfidential, RequiresLocation, IsActive: !IsActive });
      setToggle(null);
      setError(null);
      await Load();
    } catch (err) {
      setToggle(null);
      setError(ErrorMessage(err, "Gagal mengubah status kategori"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Manajemen Kategori</h1>
        <button className="btn-primary" onClick={() => Open("new")}>
          + Tambah Kategori
        </button>
      </div>
      {message && <Alert Kind="success">{message}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="card overflow-x-auto">
        {loadError ? (
          <ErrorState Message={loadError} OnRetry={Load} />
        ) : !categories ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <EmptyState Title="Belum ada kategori" Description="Tambahkan kategori agar mahasiswa bisa membuat laporan." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Unit</th>
                <th className="text-right">SLA</th>
                <th>Rahasia</th>
                <th>Lokasi</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.Id}>
                  <td>
                    <p className="font-medium text-slate-900">{c.Name}</p>
                    <p className="text-xs text-slate-500">{c.Description}</p>
                  </td>
                  <td className="whitespace-nowrap">{c.UnitName}</td>
                  <td className="text-right tabular-nums">{c.SlaHours} jam</td>
                  <td>{c.IsConfidential ? "Ya" : "Tidak"}</td>
                  <td>{c.RequiresLocation ? "Wajib" : "Tidak"}</td>
                  <td>
                    <ActiveBadge Active={c.IsActive} />
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => Open(c)}>
                      Edit
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => setToggle(c)}>
                      {c.IsActive ? "Nonaktifkan" : "Aktifkan"}
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
        Title={editing === "new" ? "Tambah Kategori" : "Edit Kategori"}
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
          <div>
            <label className="label">Unit tujuan</label>
            <select className="input" value={form.UnitId} onChange={(e) => setForm({ ...form, UnitId: e.target.value })}>
              <option value="">Pilih unit...</option>
              {units.map((u) => (
                <option key={u.Id} value={u.Id}>
                  {u.Name}
                </option>
              ))}
            </select>
            <FieldError Errors={errors} Name="UnitId" />
          </div>
          <div>
            <label className="label">Nama kategori</label>
            <input className="input" value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
            <FieldError Errors={errors} Name="Name" />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" value={form.Description} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
            <FieldError Errors={errors} Name="Description" />
          </div>
          <div>
            <label className="label">SLA (jam)</label>
            <input type="number" min={1} className="input" value={form.SlaHours} onChange={(e) => setForm({ ...form, SlaHours: e.target.value })} />
            <FieldError Errors={errors} Name="SlaHours" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.IsConfidential} onChange={(e) => setForm({ ...form, IsConfidential: e.target.checked })} />
            Kategori rahasia (isi tiket tidak terlihat oleh admin)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.RequiresLocation} onChange={(e) => setForm({ ...form, RequiresLocation: e.target.checked })} />
            Wajib isi lokasi (untuk laporan fasilitas: gedung, lantai, ruang)
          </label>
        </div>
      </Modal>
      <ConfirmDialog
        Open={!!toggle}
        Title={toggle?.IsActive ? "Nonaktifkan kategori?" : "Aktifkan kategori?"}
        Message={toggle?.IsActive ? "Kategori tidak bisa dipilih untuk tiket baru. Tiket lama tetap tersimpan." : "Kategori akan tersedia kembali."}
        Danger={toggle?.IsActive}
        Busy={busy}
        OnCancel={() => setToggle(null)}
        OnConfirm={ToggleActive}
      />
    </div>
  );
}
