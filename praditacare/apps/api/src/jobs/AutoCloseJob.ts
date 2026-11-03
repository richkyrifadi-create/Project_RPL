import cron from "node-cron";
import { AutoCloseDays } from "@praditacare/shared";
import { prisma } from "../Prisma.js";
import { ApplyStatusChange } from "../services/TicketService.js";

export async function AutoCloseResolvedTickets(): Promise<number> {
  const threshold = new Date(Date.now() - AutoCloseDays * 86400000);
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
      .then((count) => count && console.log(`[AutoClose] ${count} tiket ditutup otomatis`))
      .catch((err) => console.error("[AutoClose] gagal", err));
  run();
  cron.schedule("0 * * * *", run, { timezone: "Asia/Jakarta" });
}
