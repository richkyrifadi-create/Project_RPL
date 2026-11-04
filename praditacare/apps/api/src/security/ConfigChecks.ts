/** Pemeriksaan konfigurasi keamanan saat server dinyalakan. */
export const ExampleJwtSecret = "ganti-dengan-string-acak-yang-panjang";
export const MinJwtSecretLength = 32;

export interface SecurityConfigInput {
  IsProduction: boolean;
  JwtSecret: string;
  CorsOrigin: string[];
}

/** Mengembalikan daftar masalah konfigurasi. Di production, server menolak menyala bila ada masalah. */
export function CheckSecurityConfig(input: SecurityConfigInput): string[] {
  const problems: string[] = [];
  if (input.JwtSecret === ExampleJwtSecret) problems.push("JWT_SECRET masih memakai nilai contoh dari .env.example");
  else if (input.JwtSecret.length < MinJwtSecretLength) problems.push(`JWT_SECRET minimal ${MinJwtSecretLength} karakter`);
  if (input.CorsOrigin.includes("*")) problems.push("CORS_ORIGIN tidak boleh '*' karena API memakai token login");
  return problems;
}
