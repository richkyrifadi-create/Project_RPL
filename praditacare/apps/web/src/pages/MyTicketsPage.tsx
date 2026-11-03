import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormatDate, TicketStatusLabels, TicketStatusValues, type PagedResponse, type Ticket, type TicketStatus } from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { SlaBadge, StatusBadge } from "../components/Badges";
import { Alert, EmptyState, Pagination, Spinner } from "../components/Ui";

export function MyTicketsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResponse<Ticket> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    Api.Get<PagedResponse<Ticket>>("/tickets", { Status: status, Page: page, PageSize: 10 })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat tiket"));
  }, [status, page]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Tiket Saya</h1>
          <p className="text-sm text-slate-500">Pantau status bantuan dan pengaduan yang Anda kirim.</p>
        </div>
        <Link to="/tiket-baru" className="btn-primary">
          + Buat Tiket
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["", ...TicketStatusValues] as const).map((value) => (
          <button
            key={value || "all"}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              status === value ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {value ? TicketStatusLabels[value] : "Semua"}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="card overflow-hidden">
        {!data ? (
          <Spinner />
        ) : data.Items.length === 0 ? (
          <EmptyState
            Title="Belum ada tiket"
            Description="Ada kendala akademik, keuangan, fasilitas, IT, atau butuh konseling? Kirim tiket dan unit terkait akan membantu."
            Action={
              <Link to="/tiket-baru" className="btn-primary">
                Buat Tiket
              </Link>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.Items.map((t) => (
                <li key={t.Id}>
                  <Link to={`/tiket/${t.Id}`} className="block space-y-2 px-4 py-4 active:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-500">{t.TicketNumber}</span>
                      <StatusBadge Status={t.Status} />
                    </div>
                    <p className="font-medium text-slate-900">{t.Title}</p>
                    <p className="text-xs text-slate-500">
                      {t.CategoryName} · {FormatDate(t.CreatedAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Judul</th>
                    <th>Kategori</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.Items.map((t) => (
                    <tr key={t.Id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/tiket/${t.Id}`)}>
                      <td className="font-mono text-xs">{t.TicketNumber}</td>
                      <td className="font-medium text-slate-900">{t.Title}</td>
                      <td>{t.CategoryName}</td>
                      <td>
                        <StatusBadge Status={t.Status} />
                      </td>
                      <td>
                        <SlaBadge Status={t.SlaStatus} />
                      </td>
                      <td className="whitespace-nowrap">{FormatDate(t.CreatedAt)}</td>
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
