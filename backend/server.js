import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { createToken, requireAuth, safeEqual } from "./auth.js";
import { query } from "./db.js";
import { runMigrations } from "./migrate.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ allowedHeaders: ["Content-Type", "Authorization"], origin: corsOrigin }));
app.use(express.json());

const statusSchema = z.enum(["pending", "confirmed", "completed", "cancelled"]);

const appointmentSchema = z.object({
  clientName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional().default(""),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function toAppointment(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    phone: row.phone,
    email: row.email || "",
    serviceId: row.service_id,
    date: row.appointment_date,
    time: String(row.appointment_time).slice(0, 5),
    status: row.status,
    notes: row.notes || "",
  };
}

async function findAppointment(id) {
  const rows = await query(
    `
      select
        a.id,
        a.service_id,
        a.appointment_date::text,
        a.appointment_time::text,
        a.status,
        a.notes,
        c.full_name as client_name,
        c.phone,
        c.email
      from appointments a
      join clients c on c.id = a.client_id
      where a.id = $1
    `,
    [id],
  );

  return rows[0] ? toAppointment(rows[0]) : null;
}

async function getOrCreateClient({ clientName, phone, email }) {
  const existing = await query("select id from clients where phone = $1 limit 1", [phone]);

  if (existing[0]) {
    await query("update clients set full_name = $1, email = nullif($2, ''), updated_at = now() where id = $3", [
      clientName,
      email || "",
      existing[0].id,
    ]);
    return existing[0].id;
  }

  const inserted = await query(
    "insert into clients (full_name, phone, email) values ($1, $2, nullif($3, '')) returning id",
    [clientName, phone, email || ""],
  );
  return inserted[0].id;
}

app.get("/api/health", async (_request, response) => {
  await query("select 1");
  response.json({ ok: true, database: "connected" });
});

app.post("/api/auth/login", (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Identifiants invalides" });
    return;
  }

  const expectedUsername = process.env.PRO_USERNAME || "pro";
  const expectedPassword = process.env.PRO_PASSWORD || "change-me-now";
  const isAllowed =
    safeEqual(parsed.data.username, expectedUsername) && safeEqual(parsed.data.password, expectedPassword);

  if (!isAllowed) {
    response.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  response.json({ token: createToken(expectedUsername), username: expectedUsername });
});

app.get("/api/auth/me", requireAuth, (request, response) => {
  response.json({ username: request.session.username });
});

app.get("/api/services", async (_request, response) => {
  const rows = await query(
    `
      select id, name, duration_minutes, price_cents, description
      from services
      where active = true
      order by sort_order, name
    `,
  );

  response.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      duration: Number(row.duration_minutes),
      price: Math.round(Number(row.price_cents) / 100),
      description: row.description || "",
    })),
  );
});

app.get("/api/appointments", requireAuth, async (request, response) => {
  const { from, to, status } = request.query;
  const values = [];
  const filters = [];

  if (typeof from === "string" && from) {
    values.push(from);
    filters.push(`a.appointment_date >= $${values.length}`);
  }

  if (typeof to === "string" && to) {
    values.push(to);
    filters.push(`a.appointment_date <= $${values.length}`);
  }

  if (typeof status === "string" && status) {
    values.push(status);
    filters.push(`a.status = $${values.length}`);
  }

  const whereClause = filters.length ? `where ${filters.join(" and ")}` : "";
  const rows = await query(
    `
      select
        a.id,
        a.service_id,
        a.appointment_date::text,
        a.appointment_time::text,
        a.status,
        a.notes,
        c.full_name as client_name,
        c.phone,
        c.email
      from appointments a
      join clients c on c.id = a.client_id
      ${whereClause}
      order by a.appointment_date, a.appointment_time
    `,
    values,
  );

  response.json(rows.map(toAppointment));
});

app.post("/api/appointments", requireAuth, async (request, response) => {
  const parsed = appointmentSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Champs invalides", details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const serviceRows = await query("select id from services where id = $1 and active = true", [data.serviceId]);

  if (!serviceRows[0]) {
    response.status(404).json({ error: "Prestation introuvable" });
    return;
  }

  const conflicts = await query(
    `
      select id
      from appointments
      where appointment_date = $1
        and appointment_time = $2
        and status <> 'cancelled'
      limit 1
    `,
    [data.date, data.time],
  );

  if (conflicts[0]) {
    response.status(409).json({ error: "Ce creneau est deja reserve" });
    return;
  }

  const clientId = await getOrCreateClient(data);
  const inserted = await query(
    `
      insert into appointments (client_id, service_id, appointment_date, appointment_time, notes)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [clientId, data.serviceId, data.date, data.time, data.notes],
  );

  response.status(201).json(await findAppointment(inserted[0].id));
});

app.patch("/api/appointments/:id/status", requireAuth, async (request, response) => {
  const parsed = z.object({ status: statusSchema }).safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Statut invalide" });
    return;
  }

  const rows = await query(
    "update appointments set status = $1, updated_at = now() where id = $2 returning id",
    [parsed.data.status, request.params.id],
  );

  if (!rows[0]) {
    response.status(404).json({ error: "Rendez-vous introuvable" });
    return;
  }

  response.json(await findAppointment(request.params.id));
});

app.get("/api/dashboard/summary", requireAuth, async (_request, response) => {
  const rows = await query(
    `
      select
        count(*) filter (where appointment_date = current_date and status <> 'cancelled') as today_count,
        count(*) filter (where status = 'pending') as pending_count,
        coalesce(sum(s.price_cents) filter (where a.status <> 'cancelled'), 0) as revenue_cents
      from appointments a
      join services s on s.id = a.service_id
    `,
  );

  response.json({
    todayCount: Number(rows[0].today_count),
    pendingCount: Number(rows[0].pending_count),
    revenue: Math.round(Number(rows[0].revenue_cents) / 100),
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Erreur serveur" });
});

await runMigrations();

app.listen(port, () => {
  console.log(`API rendez-vous locks disponible sur http://localhost:${port}`);
});