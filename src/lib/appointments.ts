import { db } from "@/db";
import { appointments, lockServices } from "@/db/schema";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

export const availableSlots = [
  "09:00",
  "10:30",
  "12:00",
  "14:00",
  "15:30",
  "17:00",
] as const;

export const statusLabels = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
} as const;

export const statusClasses = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
} as const;

const starterServices = [
  {
    name: "Départ de locks",
    description:
      "Création de bases propres au peigne, twist ou crochet avec diagnostic du cuir chevelu.",
    durationMinutes: 180,
    priceCents: 8500,
    imageLabel: "Starter",
  },
  {
    name: "Retwist classique",
    description:
      "Entretien des repousses, lavage doux, séparation nette et finition soignée.",
    durationMinutes: 120,
    priceCents: 5500,
    imageLabel: "Retwist",
  },
  {
    name: "Coiffure locks",
    description:
      "Mise en forme protectrice, chignon, barrels ou style personnalisé après entretien.",
    durationMinutes: 90,
    priceCents: 4500,
    imageLabel: "Style",
  },
  {
    name: "Réparation & crochet",
    description:
      "Reprise de locks fragilisées, rattachement, resserrage et conseils d’entretien.",
    durationMinutes: 150,
    priceCents: 7000,
    imageLabel: "Repair",
  },
];

export async function ensureStarterServices() {
  const existing = await db.select({ id: lockServices.id }).from(lockServices).limit(1);

  if (existing.length === 0) {
    await db.insert(lockServices).values(starterServices);
  }
}

export async function getServices() {
  await ensureStarterServices();

  return db
    .select()
    .from(lockServices)
    .orderBy(asc(lockServices.priceCents), asc(lockServices.id));
}

export async function getUpcomingAppointments() {
  await ensureStarterServices();
  const today = new Date().toISOString().slice(0, 10);

  return db
    .select({
      id: appointments.id,
      clientName: appointments.clientName,
      clientPhone: appointments.clientPhone,
      clientEmail: appointments.clientEmail,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      notes: appointments.notes,
      status: appointments.status,
      createdAt: appointments.createdAt,
      serviceName: lockServices.name,
      serviceDuration: lockServices.durationMinutes,
      servicePrice: lockServices.priceCents,
    })
    .from(appointments)
    .innerJoin(lockServices, eq(appointments.serviceId, lockServices.id))
    .where(gte(appointments.appointmentDate, today))
    .orderBy(asc(appointments.appointmentDate), asc(appointments.appointmentTime));
}

export async function getRecentAppointments(limit = 6) {
  await ensureStarterServices();

  return db
    .select({
      id: appointments.id,
      clientName: appointments.clientName,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      status: appointments.status,
      serviceName: lockServices.name,
    })
    .from(appointments)
    .innerJoin(lockServices, eq(appointments.serviceId, lockServices.id))
    .orderBy(desc(appointments.createdAt))
    .limit(limit);
}

export async function getDashboardStats() {
  await ensureStarterServices();
  const today = new Date().toISOString().slice(0, 10);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments);

  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(eq(appointments.status, "pending"));

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(eq(appointments.appointmentDate, today));

  const [revenueRow] = await db
    .select({ cents: sql<number>`coalesce(sum(${lockServices.priceCents}), 0)::int` })
    .from(appointments)
    .innerJoin(lockServices, eq(appointments.serviceId, lockServices.id))
    .where(eq(appointments.status, "completed"));

  return {
    total: totalRow?.count ?? 0,
    pending: pendingRow?.count ?? 0,
    today: todayRow?.count ?? 0,
    completedRevenueCents: revenueRow?.cents ?? 0,
  };
}

export async function isSlotAvailable(date: string, time: string) {
  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.appointmentDate, date),
        eq(appointments.appointmentTime, time),
        sql`${appointments.status} <> 'cancelled'`,
      ),
    )
    .limit(1);

  return existing.length === 0;
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatFrenchDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}
