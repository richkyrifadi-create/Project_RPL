export const SlaStatusValues = ["ON_TRACK", "AT_RISK", "OVERDUE", "MET", "BREACHED"] as const;
export type SlaStatus = (typeof SlaStatusValues)[number];
