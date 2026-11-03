import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  DashboardQuerySchema,
  GetLocationHotspots,
  GetSlaStatus,
  ToJakartaDateInput,
  type ActionCountResponse,
  type DashboardResponse,
  type DashboardSummary,
  type SlaStatus
} from "@praditacare/shared";
import { GetAuthUser, RequireRole } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { prisma } from "../Prisma.js";

export const DashboardRoutes = Router();

const HoursBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 3600000;
const Average = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);

interface TicketRow {
  Status: string;
  CreatedAt: Date;
  DueAt: Date;
  FirstResponseAt: Date | null;
  ResolvedAt: Date | null;
  ClosedAt: Date | null;
  Category: { SlaHours: number };
  Feedback: { Rating: number } | null;
}

function Compliance(statuses: SlaStatus[]): number | null {
  const met = statuses.filter((s) => s === "MET").length;
  const judged = statuses.filter((s) => s === "MET" || s === "BREACHED" || s === "OVERDUE").length;
  return judged ? Math.round((met / judged) * 1000) / 10 : null;
}

function Summarize(tickets: TicketRow[]): DashboardSummary {
  const sla = tickets.map((t) => GetSlaStatus({ ...t, SlaHours: t.Category.SlaHours }));
  return {
    TotalTickets: tickets.length,
    OpenTickets: tickets.filter((t) => t.Status === "OPEN").length,
    InProgressTickets: tickets.filter((t) => t.Status === "IN_PROGRESS" || t.Status === "WAITING_REPORTER").length,
    ResolvedTickets: tickets.filter((t) => t.Status === "RESOLVED" || t.Status === "CLOSED").length,
    OverdueTickets: sla.filter((s) => s === "OVERDUE").length,
    AverageFirstResponseHours: Average(tickets.filter((t) => t.FirstResponseAt).map((t) => HoursBetween(t.CreatedAt, t.FirstResponseAt!))),
    AverageResolutionHours: Average(tickets.filter((t) => t.ResolvedAt).map((t) => HoursBetween(t.CreatedAt, t.ResolvedAt!))),
    SlaComplianceRate: Compliance(sla),
    AverageRating: Average(tickets.filter((t) => t.Feedback).map((t) => t.Feedback!.Rating))
  };
}

DashboardRoutes.get(
  "/",
  RequireRole("STAFF", "ADMIN"),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const query = DashboardQuerySchema.parse(req.query);
    const today = new Date();
    const to = query.To ?? ToJakartaDateInput(today);
    const from = query.From ?? ToJakartaDateInput(new Date(today.getTime() - 29 * 86400000));
    const unitId = user.Role === "STAFF" ? user.UnitId ?? -1 : query.UnitId;
    const where: Prisma.TicketWhereInput = {
      CreatedAt: { gte: new Date(`${from}T00:00:00+07:00`), lte: new Date(`${to}T23:59:59.999+07:00`) },
      ...(unitId ? { UnitId: unitId } : {})
    };
    const [tickets, units] = await Promise.all([
      prisma.ticket.findMany({ where, include: { Category: true, Feedback: true } }),
      prisma.unit.findMany({ where: unitId ? { Id: unitId } : { IsActive: true }, orderBy: { Name: "asc" } })
    ]);
    const categoryMap = new Map<number, { CategoryId: number; CategoryName: string; TicketCount: number }>();
    for (const t of tickets) {
      const row = categoryMap.get(t.CategoryId) ?? { CategoryId: t.CategoryId, CategoryName: t.Category.Name, TicketCount: 0 };
      row.TicketCount += 1;
      categoryMap.set(t.CategoryId, row);
    }
    const response: DashboardResponse = {
      From: from,
      To: to,
      Summary: Summarize(tickets),
      Units: units.map((unit) => {
        const summary = Summarize(tickets.filter((t) => t.UnitId === unit.Id));
        return {
          UnitId: unit.Id,
          UnitName: unit.Name,
          OpenTickets: summary.OpenTickets,
          OverdueTickets: summary.OverdueTickets,
          SlaComplianceRate: summary.SlaComplianceRate,
          AverageRating: summary.AverageRating
        };
      }),
      Categories: [...categoryMap.values()].sort((a, b) => b.TicketCount - a.TicketCount),
      Locations: GetLocationHotspots(
        tickets.map((t) => ({ Location: t.Location, Status: t.Status, CategoryName: t.Category.Name, IsConfidential: t.Category.IsConfidential }))
      )
    };
    res.json(response);
  })
);

DashboardRoutes.get(
  "/action-count",
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    let where: Prisma.TicketWhereInput;
    if (user.Role === "STUDENT") {
      where = { ReporterId: user.Id, OR: [{ Status: "WAITING_REPORTER" }, { Status: "RESOLVED", Feedback: null }] };
    } else if (user.Role === "STAFF") {
      where = {
        OR: [
          { UnitId: user.UnitId ?? -1, Status: "OPEN", AssigneeId: null },
          { AssigneeId: user.Id, Status: { in: ["OPEN", "IN_PROGRESS"] } }
        ]
      };
    } else {
      where = {
        OR: [
          { Status: "OPEN", AssigneeId: null },
          { Status: { in: ["OPEN", "IN_PROGRESS", "WAITING_REPORTER"] }, DueAt: { lt: new Date() } }
        ]
      };
    }
    const response: ActionCountResponse = { Count: await prisma.ticket.count({ where }) };
    res.json(response);
  })
);
