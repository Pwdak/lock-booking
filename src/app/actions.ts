"use server";

import { db } from "@/db";
import { appointments } from "@/db/schema";
import { availableSlots, isSlotAvailable } from "@/lib/appointments";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const validStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;

function cleanString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isFutureOrToday(dateValue: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${dateValue}T00:00:00`);

  return selected >= today;
}

export async function createAppointment(formData: FormData) {
  const clientName = cleanString(formData.get("clientName"));
  const clientPhone = cleanString(formData.get("clientPhone"));
  const clientEmail = cleanString(formData.get("clientEmail")).toLowerCase();
  const appointmentDate = cleanString(formData.get("appointmentDate"));
  const appointmentTime = cleanString(formData.get("appointmentTime"));
  const notes = cleanString(formData.get("notes"));
  const serviceId = Number(cleanString(formData.get("serviceId")));

  const hasRequiredFields =
    clientName.length >= 2 &&
    clientPhone.length >= 6 &&
    isValidEmail(clientEmail) &&
    Number.isInteger(serviceId) &&
    serviceId > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) &&
    availableSlots.includes(appointmentTime as (typeof availableSlots)[number]) &&
    isFutureOrToday(appointmentDate);

  if (!hasRequiredFields) {
    redirect("/?message=invalid#reservation");
  }

  const available = await isSlotAvailable(appointmentDate, appointmentTime);

  if (!available) {
    redirect("/?message=unavailable#reservation");
  }

  await db.insert(appointments).values({
    clientName,
    clientPhone,
    clientEmail,
    serviceId,
    appointmentDate,
    appointmentTime,
    notes,
  });

  revalidatePath("/");
  redirect("/?message=booked#planning");
}

export async function updateAppointmentStatus(formData: FormData) {
  const appointmentId = Number(cleanString(formData.get("appointmentId")));
  const status = cleanString(formData.get("status"));

  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    redirect("/?message=invalid-status#planning");
  }

  if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
    redirect("/?message=invalid-status#planning");
  }

  await db
    .update(appointments)
    .set({
      status: status as (typeof validStatuses)[number],
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));

  revalidatePath("/");
  redirect("/?message=status-updated#planning");
}
