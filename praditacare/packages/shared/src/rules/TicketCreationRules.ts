// US1: Mahasiswa membuat laporan yang langsung diteruskan ke unit yang tepat dengan batas waktu SLA.
import { ValidateTicketLocation } from "../utils/TicketLocation.js";
import { Allow, Deny, type RuleResult } from "./RuleResult.js";

export const TicketNumberDigits = 6;
const HourMs = 3600 * 1000;

/** Batas waktu penanganan = waktu laporan dibuat + SLA kategori (jam). */
export function CalculateDueAt(createdAt: Date, slaHours: number): Date {
  if (!Number.isInteger(slaHours) || slaHours < 1) throw new Error("SLA kategori harus bilangan bulat minimal 1 jam");
  return new Date(createdAt.getTime() + slaHours * HourMs);
}

/** Nomor tiket berformat PC-YYYY-NNNNNN, urutan diulang setiap tahun. */
export function FormatTicketNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Nomor urut tiket harus mulai dari 1");
  if (sequence >= 10 ** TicketNumberDigits) throw new Error(`Nomor urut tiket tahun ${year} melebihi ${TicketNumberDigits} digit`);
  return `PC-${year}-${String(sequence).padStart(TicketNumberDigits, "0")}`;
}

export interface CategoryForNewTicket {
  IsActive: boolean;
  UnitIsActive: boolean;
  RequiresLocation: boolean;
}

export interface NewTicketCheck {
  Result: RuleResult;
  Field?: "CategoryId" | "Location";
}

/** Kategori harus aktif (beserta unitnya), dan lokasi diisi bila kategori mewajibkan. */
export function CheckNewTicket(category: CategoryForNewTicket | null, location: string | null | undefined): NewTicketCheck {
  if (!category || !category.IsActive || !category.UnitIsActive) return { Result: Deny("Kategori tidak tersedia"), Field: "CategoryId" };
  const locationError = ValidateTicketLocation(category.RequiresLocation, location);
  if (locationError) return { Result: Deny(locationError), Field: "Location" };
  return { Result: Allow() };
}
