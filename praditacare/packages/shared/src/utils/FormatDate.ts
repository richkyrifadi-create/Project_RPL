import { AppTimeZone } from "../constants/Labels.js";

export function FormatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: AppTimeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function FormatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeZone: AppTimeZone, day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function ToJakartaDateInput(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: AppTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
