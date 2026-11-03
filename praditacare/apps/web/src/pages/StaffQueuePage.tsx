import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FormatDateTime,
  GetRemainingText,
  TicketPriorityLabels,
  TicketPriorityValues,
  TicketStatusLabels,
  TicketStatusValues,
  type Category,
  type PagedResponse,
  type Ticket,
  type Unit
} from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { UseAuth } from "../auth/AuthContext";
import { PriorityText, SlaBadge, StatusBadge } from "../components/Badges";
import { Alert, EmptyState, Pagination, Spinner } from "../components/Ui";

type Tab = "none" | "me" | "all";
const Tabs: { Key: Tab; Label: string }[] = [
  { Key: "none", Label: "Belum Ditugaskan" },
  { Key: "me", Label: "Tugas Saya" },
  { Key: "all", Label: "Semua Tiket Unit" }
];

export function StaffQueuePage() {
  const { User } = UseAuth();
  const navigate = useNavigate();
  const isAdmin = User?.Role === "ADMIN";
  const [tab, setTab] = useState<Tab>(isAdmin ? "all" : "none");
  const [filters, setFilters] = useState({ Status: "", Priority: "", CategoryId: "", UnitId: "", Keyword: "", From: "", To: "", SortBy: "DueAt" });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResponse<Ticket> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Api.Get<Category[]>("/categories").then(setCategories).catch(() => undefined);
    if (isAdmin) Api.Get<Unit[]>("/units").then(setUnits).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    setData(null);
    const activeOnly = tab !== "all" && !filters.Status;
    Api.Get<PagedResponse<Ticket>>("/tickets", {
      ...filters,
      AssigneeId: tab === "all" ? undefined : tab,
      ActiveOnly: activeOnly || undefined,
      Page: page,
      PageSize: 15
    })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat tiket"));
  }, [tab, filters, page]);

  const SetFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const visibleCategories = User?.Role === "STAFF" ? categories.filter((c) => c.UnitId === User.UnitId) : categories;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Antrian Tiket</h1>
        <p className="text-sm text-slate-500">{isAdmin ? "Semua tiket di seluruh unit." : `Tiket unit ${User?.UnitName ?? ""}.`}</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {Tabs.map((t) => (
          <button
            key={t.Key}
            onClick={() => {
              setTab(t.Key);
              setPage(1);
            }}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.Key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.Label}
          </button>
        ))}
      </div>
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <form
          className="flex gap-2 sm:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            SetFilter("Keyword", keywordDraft);
          }}
        >
          <input className="input" placeholder="Cari nomor, judul, deskripsi, atau lokasi..." value={keywordDraft} onChange={(e) => setKeywordDraft(e.target.value)} />
          <button className="btn-secondary">Cari</button>
        </form>
        <select className="input" value={filters.Status} onChange={(e) => SetFilter("Status", e.target.value)}>
          <option value="">Semua status</option>
          {TicketStatusValues.map((s) => (
            <option key={s} value={s}>
              {TicketStatusLabels[s]}
            </option>
          ))}
        </select>
        <select className="input" value={filters.Priority} onChange={(e) => SetFilter("Priority", e.target.value)}>
          <option value="">Semua prioritas</option>
          {TicketPriorityValues.map((p) => (
            <option key={p} value={p}>
              {TicketPriorityLabels[p]}
            </option>
          ))}
        </select>
        <select className="input" value={filters.CategoryId} onChange={(e) => SetFilter("CategoryId", e.target.value)}>
          <option value="">Semua kategori</option>
          {visibleCategories.map((c) => (
            <option key={c.Id} value={c.Id}>
              {c.Name}
            </option>
          ))}
        </select>
        {isAdmin && (
          <select className="input" value={filters.UnitId} onChange={(e) => SetFilter("UnitId", e.target.value)}>
            <option value="">Semua unit</option>
            {units.map((u) => (
              <option key={u.Id} value={u.Id}>
                {u.Name}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={filters.From} onChange={(e) => SetFilter("From", e.target.value)} aria-label="Dari tanggal" />
          <span className="text-slate-400">–</span>
          <input type="date" className="input" value={filters.To} onChange={(e) => SetFilter("To", e.target.value)} aria-label="Sampai tanggal" />
        </div>
        <select className="input" value={filters.SortBy} onChange={(e) => SetFilter("SortBy", e.target.value)}>
          <option value="DueAt">Urut: batas SLA terdekat</option>
          <option value="CreatedAt">Urut: terbaru dibuat</option>
        </select>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="card overflow-hidden">
        {!data ? (
          <Spinner />
        ) : data.Items.length === 0 ? (
          <EmptyState Title="Tidak ada tiket" Description="Tidak ada tiket yang cocok dengan tab dan filter saat ini." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Judul</th>
                    <th>Kategori</th>
                    <th>Pelapor</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Batas</th>
                    <th>Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.Items.map((t) => (
                    <tr key={t.Id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/tiket/${t.Id}`)}>
                      <td className="whitespace-nowrap font-mono text-xs">{t.TicketNumber}</td>
                      <td className="min-w-48 font-medium text-slate-900">
                        {t.Title ?? <span className="italic text-slate-400">Rahasia</span>}
                        {t.IsConfidential && t.Title && <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white">Rahasia</span>}
                        {t.Location && <p className="text-xs font-normal text-slate-500">{t.Location}</p>}
                      </td>
                      <td className="whitespace-nowrap">
                        {t.CategoryName}
                        {isAdmin && <p className="text-xs text-slate-400">{t.UnitName}</p>}
                      </td>
                      <td className="whitespace-nowrap">{t.ReporterName}</td>
                      <td>
                        <PriorityText Priority={t.Priority} />
                      </td>
                      <td>
                        <StatusBadge Status={t.Status} />
                      </td>
                      <td>
                        <SlaBadge Status={t.SlaStatus} />
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {FormatDateTime(t.DueAt)}
                        {["OPEN", "IN_PROGRESS", "WAITING_REPORTER"].includes(t.Status) && (
                          <p className={t.SlaStatus === "OVERDUE" ? "text-red-600" : "text-slate-400"}>{GetRemainingText(t.DueAt)}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{t.AssigneeName ?? <span className="text-slate-400">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination Page={data.Page} TotalPages={data.TotalPages} OnChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
