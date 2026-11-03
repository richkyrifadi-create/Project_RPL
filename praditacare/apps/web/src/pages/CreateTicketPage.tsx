import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreateTicketSchema,
  TicketPriorityLabels,
  TicketPriorityValues,
  UploadLimits,
  ValidateTicketLocation,
  type Category,
  type Ticket,
  type TicketPriority
} from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { Alert, FieldError, Spinner } from "../components/Ui";

function FormatSla(hours: number) {
  return hours >= 24 && hours % 24 === 0 ? `${hours / 24} hari` : `${hours} jam`;
}

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Api.Get<Category[]>("/categories").then(setCategories).catch(() => setError("Gagal memuat kategori"));
  }, []);

  const selected = useMemo(() => categories?.find((c) => String(c.Id) === categoryId), [categories, categoryId]);

  function PickFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const invalid = picked.find((f) => !(UploadLimits.AllowedMimeTypes as readonly string[]).includes(f.type));
    if (invalid) return setError(`File "${invalid.name}" tidak didukung. Hanya JPG, PNG, dan PDF.`);
    if (picked.length > UploadLimits.MaxFilesPerUpload) return setError("Maksimal 5 file per unggahan.");
    setError(null);
    setFiles(picked);
  }

  async function Submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const requiresLocation = selected?.RequiresLocation ?? false;
    const parsed = CreateTicketSchema.safeParse({
      Title: title,
      Description: description,
      CategoryId: categoryId || undefined,
      Location: requiresLocation ? location : null,
      Priority: priority,
      IsAnonymous: isAnonymous
    });
    const locationError = ValidateTicketLocation(requiresLocation, requiresLocation ? location : null);
    if (!parsed.success || locationError) {
      const fieldErrors = (parsed.success ? {} : parsed.error.flatten().fieldErrors) as Record<string, string[]>;
      if (locationError) fieldErrors.Location = [locationError];
      setErrors(fieldErrors);
      return;
    }
    setErrors(undefined);
    const form = new FormData();
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) form.append(key, String(value));
    });
    files.forEach((file) => form.append("Files", file));
    setBusy(true);
    try {
      const ticket = await Api.Send<Ticket>("POST", "/tickets", form);
      navigate(`/tiket/${ticket.Id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrors(err.Errors);
      } else setError("Gagal mengirim tiket");
    } finally {
      setBusy(false);
    }
  }

  if (!categories) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="page-title">Buat Tiket</h1>
        <p className="text-sm text-slate-500">Jelaskan kendala Anda. Tiket akan diteruskan otomatis ke unit yang tepat.</p>
      </div>
      <form onSubmit={Submit} className="card space-y-5 p-5 sm:p-6" noValidate>
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label" htmlFor="category">
            Kategori
          </label>
          <select id="category" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Pilih kategori...</option>
            {categories.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.Name} ({c.UnitName})
              </option>
            ))}
          </select>
          <FieldError Errors={errors} Name="CategoryId" />
          {selected && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-slate-500">
                Diteruskan ke unit <span className="font-medium text-slate-700">{selected.UnitName}</span> · Estimasi penanganan{" "}
                <span className="font-medium text-slate-700">{FormatSla(selected.SlaHours)}</span>
                {selected.Description ? ` · ${selected.Description}` : ""}
              </p>
              {selected.IsConfidential && (
                <Alert Kind="info">Kategori ini bersifat rahasia. Isi tiket hanya dapat dilihat oleh Anda dan staf unit {selected.UnitName}.</Alert>
              )}
            </div>
          )}
        </div>
        {selected?.RequiresLocation && (
          <div>
            <label className="label" htmlFor="location">
              Lokasi <span className="text-red-600">*</span>
            </label>
            <input
              id="location"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Gedung A Lantai 3, Ruang 301"
              maxLength={150}
            />
            <p className="mt-1 text-xs text-slate-500">Sebutkan gedung, lantai, dan ruang agar petugas langsung menuju lokasi.</p>
            <FieldError Errors={errors} Name="Location" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="title">
            Judul
          </label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Wi-Fi gedung B sering putus" />
          <FieldError Errors={errors} Name="Title" />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Deskripsi
          </label>
          <textarea
            id="description"
            className="input min-h-32"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ceritakan kronologi, lokasi, dan apa yang sudah Anda coba."
          />
          <FieldError Errors={errors} Name="Description" />
        </div>
        <div>
          <span className="label">Prioritas</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TicketPriorityValues.map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setPriority(value)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  priority === value ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-slate-200 text-slate-600"
                }`}
              >
                {TicketPriorityLabels[value]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="files">
            Lampiran (opsional)
          </label>
          <input id="files" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="input" onChange={(e) => PickFiles(e.target.files)} />
          <p className="mt-1 text-xs text-slate-500">Maksimal 5 file, JPG, PNG, atau PDF.</p>
          {files.length > 0 && <p className="mt-1 text-xs text-slate-600">{files.map((f) => f.name).join(", ")}</p>}
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
          <input type="checkbox" className="mt-1" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          <span>
            <span className="block text-sm font-medium text-slate-800">Kirim sebagai anonim</span>
            <span className="block text-xs text-slate-500">Nama dan NIM Anda tidak akan ditampilkan kepada staf dan admin.</span>
          </span>
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Mengirim..." : "Kirim Tiket"}
          </button>
        </div>
      </form>
    </div>
  );
}
