export class HttpError extends Error {
  constructor(
    public Status: number,
    message: string,
    public Errors?: Record<string, string[]>
  ) {
    super(message);
  }
}

export const NotFound = (what = "Data") => new HttpError(404, `${what} tidak ditemukan`);
export const Forbidden = (message = "Anda tidak memiliki akses untuk aksi ini") => new HttpError(403, message);
export const Conflict = (message: string) => new HttpError(409, message);
