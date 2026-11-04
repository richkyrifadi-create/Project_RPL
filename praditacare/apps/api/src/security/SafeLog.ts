/**
 * Log aman: format satu baris "kunci=nilai" tanpa data sensitif.
 * - Kunci sensitif (password, token, authorization, secret, cookie) selalu diganti [REDACTED].
 * - Email disamarkan (b***@student.pradita.ac.id).
 * - Token JWT / Bearer di dalam teks dihapus.
 * - Isi tiket, komentar, query string, dan body request TIDAK pernah dicatat.
 */

export type LogLevel = "INFO" | "WARN" | "ERROR";
export type LogFields = Record<string, unknown>;

const SensitiveKey = /pass(word)?|token|authorization|secret|cookie|jwt|database_url/i;
const EmailPattern = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const ConnectionStringPattern = /\b(mysql|postgres(ql)?|mongodb(\+srv)?):\/\/[^\s"']+/gi;
const MaxValueLength = 300;

export function MaskEmail(email: string): string {
  return email.replace(EmailPattern, (_m, first: string, domain: string) => `${first}***@${domain}`);
}

/** Menyamarkan email, token, dan connection string di dalam sebuah teks bebas (mis. pesan error). */
export function ScrubText(text: string): string {
  const scrubbed = MaskEmail(
    text.replace(JwtPattern, "[TOKEN]").replace(BearerPattern, "Bearer [TOKEN]").replace(ConnectionStringPattern, "$1://[REDACTED]")
  );
  return scrubbed.length > MaxValueLength ? `${scrubbed.slice(0, MaxValueLength)}…` : scrubbed;
}

export function SanitizeLogFields(fields: LogFields): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SensitiveKey.test(key)) {
      result[key] = "[REDACTED]";
      continue;
    }
    const text = typeof value === "string" ? value : value instanceof Date ? value.toISOString() : JSON.stringify(value) ?? String(value);
    result[key] = ScrubText(text);
  }
  return result;
}

function Quote(value: string): string {
  return /[\s"=]/.test(value) || value === "" ? JSON.stringify(value) : value;
}

export function FormatLogLine(level: LogLevel, event: string, fields: LogFields = {}, time: Date = new Date()): string {
  const parts = Object.entries(SanitizeLogFields(fields)).map(([key, value]) => `${key}=${Quote(value)}`);
  return [time.toISOString(), level.padEnd(5), event, ...parts].join(" ");
}

/** Ringkasan error yang aman dicatat: nama, kode, pesan yang sudah disamarkan; stack hanya bila diminta (development). */
export function SafeErrorFields(err: unknown, includeStack: boolean): LogFields {
  if (!(err instanceof Error)) return { error: "UnknownError", message: ScrubText(String(err)) };
  const { code: rawCode, errorCode } = err as { code?: unknown; errorCode?: unknown };
  const code = typeof rawCode === "string" ? rawCode : errorCode;
  // Pesan Prisma memuat potongan kode pemanggil; cukup baris terakhir yang berisi penyebab.
  const lines = err.message.split("\n").map((line) => line.trim()).filter(Boolean);
  const message = err.message.includes("invocation") && lines.length ? lines[lines.length - 1] : lines.join(" ");
  const fields: LogFields = { error: err.name, code: typeof code === "string" ? code : undefined, message: ScrubText(message) };
  if (includeStack && err.stack) {
    fields.stack = err.stack
      .split("\n")
      .slice(1, 4)
      .map((line) => line.trim())
      .join(" | ");
  }
  return fields;
}

export const Log = {
  Info: (event: string, fields?: LogFields) => console.log(FormatLogLine("INFO", event, fields)),
  Warn: (event: string, fields?: LogFields) => console.warn(FormatLogLine("WARN", event, fields)),
  Error: (event: string, fields?: LogFields) => console.error(FormatLogLine("ERROR", event, fields))
};
