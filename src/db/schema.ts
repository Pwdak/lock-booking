import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const lockServices = pgTable("lock_services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents").notNull(),
  imageLabel: varchar("image_label", { length: 80 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientName: varchar("client_name", { length: 120 }).notNull(),
  clientPhone: varchar("client_phone", { length: 40 }).notNull(),
  clientEmail: varchar("client_email", { length: 160 }).notNull(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => lockServices.id, { onDelete: "restrict" }),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: varchar("appointment_time", { length: 5 }).notNull(),
  notes: text("notes").default("").notNull(),
  status: appointmentStatus("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LockService = typeof lockServices.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
