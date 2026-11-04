/**
 * Pembatas percobaan gagal (rate limit) berbasis memori, dipakai untuk login dan ganti password.
 * Hanya percobaan GAGAL yang dihitung, sehingga pengguna normal tidak pernah terblokir.
 * Catatan: data tersimpan di memori satu proses; untuk lebih dari satu instance server gunakan store bersama (mis. Redis).
 */
export interface AttemptLimiterOptions {
  MaxFailures: number;
  WindowMs: number;
  Now?: () => number;
}

export interface LimitStatus {
  Blocked: boolean;
  RetryAfterSeconds: number;
}

interface Entry {
  Count: number;
  ResetAt: number;
}

export class AttemptLimiter {
  private readonly entries = new Map<string, Entry>();
  private readonly now: () => number;

  constructor(private readonly options: AttemptLimiterOptions) {
    this.now = options.Now ?? Date.now;
  }

  private Current(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.ResetAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  Check(key: string): LimitStatus {
    const entry = this.Current(key);
    if (!entry || entry.Count < this.options.MaxFailures) return { Blocked: false, RetryAfterSeconds: 0 };
    return { Blocked: true, RetryAfterSeconds: Math.max(1, Math.ceil((entry.ResetAt - this.now()) / 1000)) };
  }

  RecordFailure(key: string): void {
    const entry = this.Current(key);
    if (entry) entry.Count += 1;
    else this.entries.set(key, { Count: 1, ResetAt: this.now() + this.options.WindowMs });
    if (this.entries.size > 10_000) this.Prune();
  }

  Reset(key: string): void {
    this.entries.delete(key);
  }

  /** Membuang entri yang sudah kedaluwarsa agar memori tidak terus bertambah. */
  Prune(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) if (entry.ResetAt <= now) this.entries.delete(key);
  }
}
