import cron from "node-cron";
import { AutoCloseDays, AutoCloseThreshold } from "@praditacare/shared";
import { prisma } from "../Prisma.js";
import { Log, SafeErrorFields } from "../security/SafeLog.js";
import { ApplyStatusChange } from "../services/TicketService.js";

export async function AutoCloseResolvedTickets(): Promise<number> {
  const threshold = AutoCloseThreshold(new Date());
  const tickets = await prisma.ticket.findMany({ where: { Status: "RESOLVED", ResolvedAt: { lte: threshold }, Feedback: null } });
  for (const ticket of tickets) {
    await prisma.$transaction((tx) =>
      ApplyStatusChange(tx, {
        Ticket: ticket,
        ToStatus: "CLOSED",
        ChangedById: null,
        Note: `Ditutup otomatis oleh sistem setelah ${AutoCloseDays} hari tanpa feedback`
      })
    );
  }
  return tickets.length;
}

export function StartAutoCloseJob() {
  const run = () =>
    AutoCloseResolvedTickets()
      .then((count) => count && Log.Info("job.auto_close", { closed: count }))
      .catch((err) => Log.Error("job.auto_close_failed", SafeErrorFields(err, false)));
  run();
  cron.schedule("0 * * * *", run, { timezone: "Asia/Jakarta" });
}
