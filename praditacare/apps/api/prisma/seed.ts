import bcrypt from "bcryptjs";
import { PrismaClient, type TicketPriority, type TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();
const SeedPassword = "Pradita123!";
const HourMs = 3600 * 1000;

const Units = [
  { Code: "AKD", Name: "Akademik", Email: "akademik@pradita.ac.id" },
  { Code: "KEU", Name: "Keuangan", Email: "keuangan@pradita.ac.id" },
  { Code: "SARPRAS", Name: "Sarana Prasarana", Email: "sarpras@pradita.ac.id" },
  { Code: "IT", Name: "IT", Email: "it@pradita.ac.id" },
  { Code: "KNS", Name: "Konseling", Email: "konseling@pradita.ac.id" }
];

const Categories = [
  { Unit: "AKD", Name: "KRS & Perwalian", Description: "Kendala pengisian KRS, perwalian, dan jadwal kuliah", SlaHours: 48 },
  { Unit: "AKD", Name: "Nilai & Transkrip", Description: "Nilai belum keluar, koreksi nilai, transkrip", SlaHours: 72 },
  { Unit: "KEU", Name: "Pembayaran Kuliah", Description: "Verifikasi pembayaran, tagihan, cicilan", SlaHours: 48 },
  { Unit: "KEU", Name: "Beasiswa", Description: "Informasi dan administrasi beasiswa", SlaHours: 120 },
  { Unit: "SARPRAS", Name: "Kerusakan Fasilitas", Description: "AC, kursi, proyektor, toilet, dan fasilitas kampus lain", SlaHours: 24 },
  { Unit: "IT", Name: "Akun & Email Kampus", Description: "Reset password, akun LMS, email kampus", SlaHours: 24 },
  { Unit: "IT", Name: "Wi-Fi & Jaringan", Description: "Koneksi internet kampus", SlaHours: 8 },
  { Unit: "KNS", Name: "Konseling Pribadi", Description: "Layanan konseling pribadi dan kesehatan mental", SlaHours: 24, IsConfidential: true }
];

const Staff = [
  { Unit: "AKD", Name: "Dewi Lestari", Email: "staf.akademik@pradita.ac.id" },
  { Unit: "KEU", Name: "Hendra Gunawan", Email: "staf.keuangan@pradita.ac.id" },
  { Unit: "SARPRAS", Name: "Rudi Hartono", Email: "staf.sarpras@pradita.ac.id" },
  { Unit: "IT", Name: "Agus Setiawan", Email: "staf.it@pradita.ac.id" },
  { Unit: "KNS", Name: "Maya Putri", Email: "staf.konseling@pradita.ac.id" }
];

const Students = [
  { Name: "Budi Santoso", Email: "budi@student.pradita.ac.id", StudentNumber: "2023010001", StudyProgram: "Informatika" },
  { Name: "Siti Rahmawati", Email: "siti@student.pradita.ac.id", StudentNumber: "2023020002", StudyProgram: "Sistem Informasi" },
  { Name: "Andi Wijaya", Email: "andi@student.pradita.ac.id", StudentNumber: "2024030003", StudyProgram: "Manajemen" }
];

type Actor = "STAFF" | "REPORTER" | "SYSTEM";

interface SeedTicket {
  Reporter: string;
  Category: string;
  Title: string;
  Description: string;
  Priority: TicketPriority;
  IsAnonymous?: boolean;
  CreatedHoursAgo: number;
  Assigned?: boolean;
  Steps?: { To: TicketStatus; At: number; By: Actor; Note?: string }[];
  Comments?: { At: number; By: Actor; Body: string; IsInternal?: boolean }[];
  Feedback?: { At: number; Rating: number; Comment: string };
}

const Tickets: SeedTicket[] = [
  {
    Reporter: "budi", Category: "Wi-Fi & Jaringan", Priority: "HIGH", CreatedHoursAgo: 2,
    Title: "Wi-Fi gedung B sering terputus", Description: "Sejak pagi Wi-Fi PRADITA-STUDENT di lantai 3 gedung B putus setiap beberapa menit."
  },
  {
    Reporter: "siti", Category: "KRS & Perwalian", Priority: "MEDIUM", CreatedHoursAgo: 30, Assigned: true,
    Title: "Tidak bisa menambah mata kuliah di KRS", Description: "Saat menambah mata kuliah Basis Data Lanjut muncul pesan kuota penuh padahal masih tersedia.",
    Steps: [{ To: "IN_PROGRESS", At: 3, By: "STAFF" }],
    Comments: [{ At: 3, By: "STAFF", Body: "Sedang kami cek dengan kaprodi terkait kuota kelas." }]
  },
  {
    Reporter: "andi", Category: "Pembayaran Kuliah", Priority: "HIGH", CreatedHoursAgo: 20, Assigned: true,
    Title: "Pembayaran semester belum terverifikasi", Description: "Saya sudah transfer tanggal 1 tetapi status di portal masih belum lunas.",
    Steps: [
      { To: "IN_PROGRESS", At: 2, By: "STAFF" },
      { To: "WAITING_REPORTER", At: 4, By: "STAFF", Note: "Menunggu bukti transfer" }
    ],
    Comments: [{ At: 4, By: "STAFF", Body: "Mohon unggah bukti transfer dalam format PDF atau JPG." }]
  },
  {
    Reporter: "budi", Category: "Kerusakan Fasilitas", Priority: "MEDIUM", CreatedHoursAgo: 40, Assigned: true,
    Title: "AC ruang 301 mati", Description: "AC di ruang 301 tidak menyala sejak minggu lalu sehingga kelas sangat panas.",
    Steps: [{ To: "IN_PROGRESS", At: 6, By: "STAFF" }],
    Comments: [{ At: 7, By: "STAFF", Body: "Teknisi vendor dijadwalkan datang, suku cadang masih dipesan.", IsInternal: true }]
  },
  {
    Reporter: "siti", Category: "Akun & Email Kampus", Priority: "MEDIUM", CreatedHoursAgo: 72, Assigned: true,
    Title: "Lupa password email kampus", Description: "Saya tidak bisa login ke email kampus dan fitur lupa password tidak mengirim kode.",
    Steps: [
      { To: "IN_PROGRESS", At: 1, By: "STAFF" },
      { To: "RESOLVED", At: 20, By: "STAFF", Note: "Password sudah direset, silakan cek SMS." }
    ]
  },
  {
    Reporter: "andi", Category: "Nilai & Transkrip", Priority: "LOW", CreatedHoursAgo: 240, Assigned: true,
    Title: "Nilai UTS Statistika belum muncul", Description: "Nilai UTS Statistika kelas B belum tampil di portal akademik.",
    Steps: [
      { To: "IN_PROGRESS", At: 5, By: "STAFF" },
      { To: "RESOLVED", At: 30, By: "STAFF", Note: "Nilai sudah diunggah dosen pengampu." }
    ],
    Feedback: { At: 40, Rating: 5, Comment: "Cepat dan jelas, terima kasih." }
  },
  {
    Reporter: "budi", Category: "Beasiswa", Priority: "MEDIUM", CreatedHoursAgo: 400, Assigned: true,
    Title: "Syarat perpanjangan beasiswa prestasi", Description: "Apakah IPK minimal 3,25 berlaku untuk semester ini juga?",
    Steps: [
      { To: "IN_PROGRESS", At: 30, By: "STAFF" },
      { To: "RESOLVED", At: 150, By: "STAFF", Note: "Syarat tetap IPK 3,25 sesuai SK terbaru." }
    ],
    Feedback: { At: 160, Rating: 4, Comment: "Jawabannya membantu walau agak lama." }
  },
  {
    Reporter: "siti", Category: "Konseling Pribadi", Priority: "HIGH", CreatedHoursAgo: 10, Assigned: true, IsAnonymous: true,
    Title: "Ingin sesi konseling", Description: "Saya merasa sangat tertekan menjelang ujian dan ingin berbicara dengan konselor.",
    Steps: [{ To: "IN_PROGRESS", At: 1, By: "STAFF" }],
    Comments: [{ At: 1, By: "STAFF", Body: "Terima kasih sudah menghubungi. Kami siapkan jadwal sesi besok pukul 10.00." }]
  },
  {
    Reporter: "andi", Category: "Wi-Fi & Jaringan", Priority: "LOW", CreatedHoursAgo: 100,
    Title: "Minta akses Wi-Fi untuk laptop baru", Description: "Laptop baru saya belum bisa terhubung ke Wi-Fi kampus.",
    Steps: [{ To: "REJECTED", At: 2, By: "STAFF", Note: "Duplikat dengan tiket sebelumnya, akses dapat diatur mandiri lewat portal IT." }]
  },
  {
    Reporter: "budi", Category: "Kerusakan Fasilitas", Priority: "LOW", CreatedHoursAgo: 20,
    Title: "Kursi rusak di perpustakaan lantai 2", Description: "Ada tiga kursi dengan kaki patah di area baca perpustakaan lantai 2."
  }
];

async function Main() {
  if ((await prisma.unit.count()) > 0) {
    console.log("Database sudah berisi data. Jalankan `npm run db:reset` untuk mengulang seed dari awal.");
    return;
  }
  const passwordHash = await bcrypt.hash(SeedPassword, 10);
  const unitByCode = new Map<string, number>();
  for (const unit of Units) unitByCode.set(unit.Code, (await prisma.unit.create({ data: unit })).Id);

  const categoryByName = new Map<string, { Id: number; UnitId: number; SlaHours: number }>();
  for (const { Unit, ...category } of Categories) {
    const created = await prisma.category.create({ data: { ...category, UnitId: unitByCode.get(Unit)! } });
    categoryByName.set(created.Name, created);
  }

  await prisma.user.create({ data: { Name: "Administrator", Email: "admin@pradita.ac.id", PasswordHash: passwordHash, Role: "ADMIN" } });
  const staffByUnit = new Map<number, number>();
  for (const { Unit, ...staff } of Staff) {
    const unitId = unitByCode.get(Unit)!;
    const created = await prisma.user.create({ data: { ...staff, PasswordHash: passwordHash, Role: "STAFF", UnitId: unitId } });
    staffByUnit.set(unitId, created.Id);
  }
  const studentByKey = new Map<string, number>();
  for (const student of Students) {
    const created = await prisma.user.create({ data: { ...student, PasswordHash: passwordHash, Role: "STUDENT" } });
    studentByKey.set(student.Email.split("@")[0], created.Id);
  }

  const now = Date.now();
  const sequence = new Map<number, number>();
  const ordered = [...Tickets].sort((a, b) => b.CreatedHoursAgo - a.CreatedHoursAgo);
  for (const seed of ordered) {
    const category = categoryByName.get(seed.Category)!;
    const reporterId = studentByKey.get(seed.Reporter)!;
    const staffId = staffByUnit.get(category.UnitId)!;
    const createdAt = new Date(now - seed.CreatedHoursAgo * HourMs);
    const at = (hours: number) => new Date(createdAt.getTime() + hours * HourMs);
    const actorId = (by: Actor) => (by === "STAFF" ? staffId : by === "REPORTER" ? reporterId : null);
    const year = createdAt.getUTCFullYear();
    const number = (sequence.get(year) ?? 0) + 1;
    sequence.set(year, number);

    const steps = [...(seed.Steps ?? [])];
    if (seed.Feedback) steps.push({ To: "CLOSED", At: seed.Feedback.At, By: "REPORTER", Note: `Feedback rating ${seed.Feedback.Rating}/5` });
    const staffTimes = [
      ...steps.filter((s) => s.By === "STAFF").map((s) => s.At),
      ...(seed.Comments ?? []).filter((c) => c.By === "STAFF" && !c.IsInternal).map((c) => c.At)
    ];
    const resolved = steps.filter((s) => s.To === "RESOLVED").pop();
    const closed = steps.find((s) => s.To === "CLOSED" || s.To === "REJECTED");
    const last = steps[steps.length - 1];

    const ticket = await prisma.ticket.create({
      data: {
        TicketNumber: `PC-${year}-${String(number).padStart(6, "0")}`,
        ReporterId: reporterId,
        CategoryId: category.Id,
        UnitId: category.UnitId,
        AssigneeId: seed.Assigned ? staffId : null,
        Title: seed.Title,
        Description: seed.Description,
        Priority: seed.Priority,
        Status: last?.To ?? "OPEN",
        IsAnonymous: seed.IsAnonymous ?? false,
        DueAt: at(category.SlaHours),
        FirstResponseAt: staffTimes.length ? at(Math.min(...staffTimes)) : null,
        ResolvedAt: resolved ? at(resolved.At) : null,
        ClosedAt: closed ? at(closed.At) : null,
        CreatedAt: createdAt,
        UpdatedAt: last ? at(last.At) : createdAt
      }
    });
    let fromStatus: TicketStatus | null = null;
    for (const step of [{ To: "OPEN" as TicketStatus, At: 0, By: "REPORTER" as Actor, Note: undefined }, ...steps]) {
      await prisma.ticketStatusHistory.create({
        data: { TicketId: ticket.Id, FromStatus: fromStatus, ToStatus: step.To, ChangedById: actorId(step.By), Note: step.Note, CreatedAt: at(step.At) }
      });
      fromStatus = step.To;
    }
    for (const comment of seed.Comments ?? []) {
      await prisma.ticketComment.create({
        data: { TicketId: ticket.Id, AuthorId: actorId(comment.By)!, Body: comment.Body, IsInternal: comment.IsInternal ?? false, CreatedAt: at(comment.At) }
      });
    }
    if (seed.Feedback) {
      await prisma.ticketFeedback.create({
        data: { TicketId: ticket.Id, Rating: seed.Feedback.Rating, Comment: seed.Feedback.Comment, CreatedAt: at(seed.Feedback.At) }
      });
    }
  }
  for (const [year, lastNumber] of sequence) {
    await prisma.ticketSequence.upsert({ where: { Year: year }, create: { Year: year, LastNumber: lastNumber }, update: { LastNumber: lastNumber } });
  }
  console.log(`Seed selesai: ${Units.length} unit, ${Categories.length} kategori, 9 user, ${Tickets.length} tiket. Password semua akun: ${SeedPassword}`);
}

Main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
