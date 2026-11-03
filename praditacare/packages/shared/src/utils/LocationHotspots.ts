// Lokasi paling sering bermasalah (Fitur 2 MVP v1).
// Lokasi diisi bebas oleh mahasiswa, jadi "Gedung A, Ruang 301" dan "Gd. A R.301" harus dihitung sebagai lokasi yang sama.

import type { DashboardLocationRow } from "../dto/DashboardResponse.js";
import { ActiveStatuses } from "../constants/TicketStatusTransitions.js";
import type { TicketStatus } from "../enums/TicketStatus.js";
import { NormalizeLocation } from "./TicketLocation.js";

const Abbreviations: Record<string, string> = {
  gd: "gedung",
  gdg: "gedung",
  lt: "lantai",
  r: "ruang",
  rg: "ruang",
  ruangan: "ruang",
  perpus: "perpustakaan",
  lab: "laboratorium"
};

/** Kunci pembanding lokasi: huruf kecil, tanpa tanda baca, singkatan umum diseragamkan. */
export function LocationKey(raw: string | null | undefined): string | null {
  const location = NormalizeLocation(raw);
  if (!location) return null;
  const tokens = location
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2") // "r301" → "r 301"
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((token) => Abbreviations[token] ?? token);
  return tokens.length ? tokens.join(" ") : null;
}

export interface HotspotTicket {
  Location: string | null;
  Status: TicketStatus;
  CategoryName: string;
  IsConfidential: boolean;
}

/**
 * Mengelompokkan tiket per lokasi lalu mengambil lokasi dengan laporan terbanyak.
 * Tiket tanpa lokasi dan tiket kategori rahasia tidak dihitung.
 */
export function GetLocationHotspots(tickets: HotspotTicket[], limit = 5): DashboardLocationRow[] {
  const groups = new Map<string, { Names: Map<string, number>; TicketCount: number; ActiveCount: number; Categories: Set<string> }>();
  for (const ticket of tickets) {
    if (ticket.IsConfidential) continue;
    const key = LocationKey(ticket.Location);
    if (!key) continue;
    const group = groups.get(key) ?? { Names: new Map(), TicketCount: 0, ActiveCount: 0, Categories: new Set() };
    const name = NormalizeLocation(ticket.Location)!;
    group.Names.set(name, (group.Names.get(name) ?? 0) + 1);
    group.TicketCount += 1;
    if (ActiveStatuses.includes(ticket.Status)) group.ActiveCount += 1;
    group.Categories.add(ticket.CategoryName);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      // Nama yang ditampilkan: penulisan yang paling sering dipakai pelapor (seri → yang pertama muncul).
      Location: [...group.Names.entries()].reduce((best, current) => (current[1] > best[1] ? current : best))[0],
      TicketCount: group.TicketCount,
      ActiveCount: group.ActiveCount,
      Categories: [...group.Categories].sort()
    }))
    .sort((a, b) => b.TicketCount - a.TicketCount || b.ActiveCount - a.ActiveCount || a.Location.localeCompare(b.Location))
    .slice(0, limit);
}
