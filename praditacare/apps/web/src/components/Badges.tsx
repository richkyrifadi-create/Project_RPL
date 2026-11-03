import {
  SlaStatusLabels,
  TicketPriorityLabels,
  TicketStatusLabels,
  type SlaStatus,
  type TicketPriority,
  type TicketStatus
} from "@praditacare/shared";

const StatusColors: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 ring-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  WAITING_REPORTER: "bg-purple-100 text-purple-800 ring-purple-200",
  RESOLVED: "bg-green-100 text-green-800 ring-green-200",
  CLOSED: "bg-slate-100 text-slate-700 ring-slate-200",
  REJECTED: "bg-red-100 text-red-800 ring-red-200"
};

const SlaColors: Record<SlaStatus, string> = {
  ON_TRACK: "bg-green-50 text-green-700 ring-green-200",
  AT_RISK: "bg-orange-100 text-orange-800 ring-orange-200",
  OVERDUE: "bg-red-100 text-red-800 ring-red-200",
  MET: "bg-green-50 text-green-700 ring-green-200",
  BREACHED: "bg-red-50 text-red-700 ring-red-200"
};

const PriorityColors: Record<TicketPriority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-slate-700",
  HIGH: "text-orange-700 font-semibold",
  URGENT: "text-red-700 font-semibold"
};

const BadgeBase = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ Status }: { Status: TicketStatus }) {
  return <span className={`${BadgeBase} ${StatusColors[Status]}`}>{TicketStatusLabels[Status]}</span>;
}

export function SlaBadge({ Status }: { Status: SlaStatus }) {
  return <span className={`${BadgeBase} ${SlaColors[Status]}`}>{SlaStatusLabels[Status]}</span>;
}

export function PriorityText({ Priority }: { Priority: TicketPriority }) {
  return <span className={`text-sm ${PriorityColors[Priority]}`}>{TicketPriorityLabels[Priority]}</span>;
}
