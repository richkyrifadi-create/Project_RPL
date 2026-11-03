// Hasil pemeriksaan aturan bisnis. API mengubah Reason menjadi pesan error, UI memakainya untuk menonaktifkan tombol.
export type RuleResult = { Allowed: true } | { Allowed: false; Reason: string };

export const Allow = (): RuleResult => ({ Allowed: true });
export const Deny = (Reason: string): RuleResult => ({ Allowed: false, Reason });
