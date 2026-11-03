import { useEffect, useState } from "react";
import type { DashboardResponse, Unit } from "@praditacare/shared";
import { Api, ApiError } from "../api/Client";
import { UseAuth } from "../auth/AuthContext";
import { Alert, EmptyState, Spinner, StatCard } from "../components/Ui";

const Hours = (v: number | null) => (v === null ? "-" : `${v.toLocaleString("id-ID")} jam`);
const Percent = (v: number | null) => (v === null ? "-" : `${v.toLocaleString("id-ID")}%`);
const Rating = (v: number | null) => (v === null ? "-" : `${v.toLocaleString("id-ID")} / 5`);

export function DashboardPage() {
  const { User } = UseAuth();
  const isAdmin = User?.Role === "ADMIN";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) Api.Get<Unit[]>("/units").then(setUnits).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    setData(null);
    Api.Get<DashboardResponse>("/dashboard", { From: from, To: to, UnitId: unitId })
      .then((d) => {
        setData(d);
        setFrom(d.From);
        setTo(d.To);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat dashboard"));
  }, [from, to, unitId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-500">{isAdmin ? "Beban kerja dan kepatuhan SLA seluruh unit." : `Kinerja unit ${User?.UnitName ?? ""}.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
          <span className="text-slate-400">–</span>
          <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
          {isAdmin && (
            <select className="input w-auto" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Semua unit</option>
              {units.map((u) => (
                <option key={u.Id} value={u.Id}>
                  {u.Name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {!data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard Label="Total tiket" Value={data.Summary.TotalTickets} />
            <StatCard Label="Terbuka" Value={data.Summary.OpenTickets} />
            <StatCard Label="Diproses" Value={data.Summary.InProgressTickets} />
            <StatCard Label="Selesai" Value={data.Summary.ResolvedTickets} />
            <StatCard Label="Terlambat" Value={data.Summary.OverdueTickets} Tone={data.Summary.OverdueTickets ? "danger" : "default"} />
            <StatCard Label="Rata-rata respons pertama" Value={Hours(data.Summary.AverageFirstResponseHours)} />
            <StatCard Label="Rata-rata penyelesaian" Value={Hours(data.Summary.AverageResolutionHours)} />
            <StatCard Label="Kepatuhan SLA" Value={Percent(data.Summary.SlaComplianceRate)} />
            <StatCard Label="Rata-rata rating" Value={Rating(data.Summary.AverageRating)} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Per unit</h2>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th className="text-right">Terbuka</th>
                      <th className="text-right">Terlambat</th>
                      <th className="text-right">Kepatuhan SLA</th>
                      <th className="text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.Units.map((u) => (
                      <tr key={u.UnitId}>
                        <td className="font-medium">{u.UnitName}</td>
                        <td className="text-right tabular-nums">{u.OpenTickets}</td>
                        <td className={`text-right tabular-nums ${u.OverdueTickets ? "font-semibold text-red-600" : ""}`}>{u.OverdueTickets}</td>
                        <td className="text-right tabular-nums">{Percent(u.SlaComplianceRate)}</td>
                        <td className="text-right tabular-nums">{Rating(u.AverageRating)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card overflow-hidden">
              <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Per kategori</h2>
              {data.Categories.length === 0 ? (
                <EmptyState Title="Belum ada tiket pada rentang ini" />
              ) : (
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th className="text-right">Jumlah tiket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.Categories.map((c) => (
                      <tr key={c.CategoryId}>
                        <td className="font-medium">{c.CategoryName}</td>
                        <td className="text-right tabular-nums">{c.TicketCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
