import { prisma } from "../Prisma.js";
import { AutoCloseResolvedTickets } from "./AutoCloseJob.js";

AutoCloseResolvedTickets()
  .then((count) => console.log(`${count} tiket ditutup otomatis`))
  .finally(() => prisma.$disconnect());
