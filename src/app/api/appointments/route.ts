import { db } from "@/db";
import { appointments } from "@/db/schema";
import {
  availableSlots,
  getUpcomingAppointments,
  isSlotAvailable,
} from "@/lib/appointments";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isFutureOrToday(dateValue: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${dateValue}T00:00:00`);

  return selected >= today;
}

export async function GET() {
  const data = await getUpcomingAppointments();
  return Response.json({ appointments: data });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      clientName: string;
      clientPhone: string;
      clientEmail: string;
      serviceId: number;
      appointmentDate: string;
      appointmentTime: string;
      notes: string;
    }>;

    const clientName = body.clientName?.trim() ?? "";
    const clientPhone = body.clientPhone?.trim() ?? "";
    const clientEmail = body.clientEmail?.trim().toLowerCase() ?? "";
    const appointmentDate = body.appointmentDate?.trim() ?? "";
    const appointmentTime = body.appointmentTime?.trim() ?? "";
    const notes = body.notes?.trim() ?? "";
    const serviceId = Number(body.serviceId);

    const isValidPayload =
      clientName.length >= 2 &&
      clientPhone.length >= 6 &&
      isValidEmail(clientEmail) &&
      Number.isInteger(serviceId) &&
      serviceId > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) &&
      isFutureOrToday(appointmentDate) &&
      availableSlots.includes(appointmentTime as (typeof availableSlots)[number]);

    if (!isValidPayload) {
      return Response.json(
        { error: "Payload invalide. Vérifiez le service, la date, l’heure et les coordonnées." },
        { status: 400 },
      );
    }

    const available = await isSlotAvailable(appointmentDate, appointmentTime);

    if (!available) {
      return Response.json({ error: "Ce créneau est déjà réservé." }, { status: 409 });
    }

    const [created] = await db
      .insert(appointments)
      .values({
        clientName,
        clientPhone,
        clientEmail,
        serviceId,
        appointmentDate,
        appointmentTime,
        notes,
      })
      .returning();

    return Response.json({ appointment: created }, { status: 201 });
  } catch {
    return Response.json({ error: "Impossible de créer le rendez-vous." }, { status: 500 });
  }
}
