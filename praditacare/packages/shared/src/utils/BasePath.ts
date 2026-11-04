/**
 * Menormalkan sub-path deploy (mis. "praditacare", "/praditacare", "/praditacare/") menjadi "/praditacare/".
 * Kosong atau "/" berarti aplikasi berada di root domain.
 */
export function NormalizeBasePath(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

/** Menggabungkan base path dengan path relatif, mis. ("/praditacare/", "api/health") -> "/praditacare/api/health". */
export function JoinBasePath(basePath: string, relative: string): string {
  return NormalizeBasePath(basePath) + relative.replace(/^\/+/, "");
}
