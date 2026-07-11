import { createAppointment, updateAppointmentStatus } from "@/app/actions";
import {
  availableSlots,
  formatFrenchDate,
  formatPrice,
  getDashboardStats,
  getRecentAppointments,
  getServices,
  getUpcomingAppointments,
  statusClasses,
  statusLabels,
} from "@/lib/appointments";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

const messageContent = {
  booked: {
    title: "Demande envoyée",
    body: "Le rendez-vous a été ajouté au planning. Il peut maintenant être confirmé.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  unavailable: {
    title: "Créneau indisponible",
    body: "Ce créneau vient d’être réservé. Merci d’en choisir un autre.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  invalid: {
    title: "Informations incomplètes",
    body: "Vérifiez le service, vos coordonnées, la date et l’heure choisies.",
    className: "border-rose-200 bg-rose-50 text-rose-900",
  },
  "status-updated": {
    title: "Statut mis à jour",
    body: "Le planning a été actualisé avec le nouveau statut du rendez-vous.",
    className: "border-sky-200 bg-sky-50 text-sky-900",
  },
  "invalid-status": {
    title: "Action impossible",
    body: "Le statut demandé n’est pas valide pour ce rendez-vous.",
    className: "border-rose-200 bg-rose-50 text-rose-900",
  },
} as const;

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({ message: undefined }));
  const [services, appointments, recentAppointments, stats] = await Promise.all([
    getServices(),
    getUpcomingAppointments(),
    getRecentAppointments(),
    getDashboardStats(),
  ]);

  const currentMessage = resolvedSearchParams.message
    ? messageContent[resolvedSearchParams.message as keyof typeof messageContent]
    : undefined;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf7f1] text-stone-950">
      <section className="relative px-6 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_top_left,_rgba(120,53,15,0.22),_transparent_36%),linear-gradient(135deg,_#fff7ed_0%,_#fef3c7_45%,_#fce7f3_100%)]" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/75 px-5 py-3 shadow-sm backdrop-blur">
          <a href="#accueil" className="flex items-center gap-3" aria-label="Accueil Locks Studio">
            <span className="grid size-11 place-items-center rounded-full bg-stone-950 text-lg text-white">
              LS
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.22em] text-amber-800">
                Locks Studio
              </span>
              <span className="text-xs text-stone-500">Planning & réservations</span>
            </span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-semibold text-stone-700 md:flex">
            <a className="transition hover:text-amber-800" href="#services">
              Services
            </a>
            <a className="transition hover:text-amber-800" href="#reservation">
              Réserver
            </a>
            <a className="transition hover:text-amber-800" href="#planning">
              Planning
            </a>
          </div>
          <a
            href="#reservation"
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-stone-950/10 transition hover:-translate-y-0.5 hover:bg-amber-900"
          >
            Prendre RDV
          </a>
        </nav>

        <div id="accueil" className="mx-auto grid max-w-7xl gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-4 py-2 text-sm font-bold text-amber-900 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              Atelier spécialisé locks, retwist et coiffures protectrices
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
              Gérez les rendez-vous de votre activité de tresseuse de locks.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-700">
              Une application complète avec vitrine de services, formulaire de réservation,
              suivi PostgreSQL et mini-tableau de bord pour confirmer, terminer ou annuler
              les demandes de clientes.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#reservation"
                className="rounded-full bg-amber-800 px-7 py-4 text-center font-black text-white shadow-xl shadow-amber-900/20 transition hover:-translate-y-1 hover:bg-stone-950"
              >
                Réserver un créneau
              </a>
              <a
                href="#planning"
                className="rounded-full border border-stone-300 bg-white/80 px-7 py-4 text-center font-black text-stone-900 transition hover:-translate-y-1 hover:border-amber-800 hover:text-amber-900"
              >
                Voir le planning
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 -top-8 size-36 rounded-full bg-amber-300/40 blur-3xl" />
            <div className="absolute -bottom-10 -left-8 size-40 rounded-full bg-pink-300/40 blur-3xl" />
            <div className="relative rounded-[2.5rem] border border-white/80 bg-stone-950 p-4 shadow-2xl shadow-stone-950/20">
              <div className="rounded-[2rem] bg-[linear-gradient(145deg,_#2c1810,_#7c2d12_48%,_#f59e0b)] p-7 text-white">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-100">
                      Aujourd’hui
                    </p>
                    <h2 className="mt-3 text-4xl font-black">{stats.today} RDV</h2>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-4 py-3 text-right backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100">CA terminé</p>
                    <p className="text-2xl font-black">{formatPrice(stats.completedRevenueCents)}</p>
                  </div>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  <StatPill label="Demandes" value={stats.total} />
                  <StatPill label="À confirmer" value={stats.pending} />
                  <StatPill label="Services" value={services.length} />
                </div>

                <div className="mt-8 rounded-3xl bg-white p-5 text-stone-950 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-black">Dernières demandes</h3>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      Live DB
                    </span>
                  </div>
                  <div className="space-y-3">
                    {recentAppointments.length === 0 ? (
                      <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                        Aucune demande pour le moment. Les nouvelles réservations apparaîtront ici.
                      </p>
                    ) : (
                      recentAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between gap-4 rounded-2xl bg-stone-50 p-3"
                        >
                          <div>
                            <p className="font-bold">{appointment.clientName}</p>
                            <p className="text-sm text-stone-500">
                              {appointment.serviceName} · {formatFrenchDate(appointment.appointmentDate)} à{" "}
                              {appointment.appointmentTime}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClasses[appointment.status]}`}
                          >
                            {statusLabels[appointment.status]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.22em] text-amber-800">Carte de services</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Prestations locks prêtes à réserver
              </h2>
            </div>
            <p className="max-w-xl text-stone-600">
              Les services sont stockés en PostgreSQL et initialisés automatiquement au premier chargement.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service, index) => (
              <article
                key={service.id}
                className="group rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5 flex h-44 items-end rounded-[1.5rem] bg-[radial-gradient(circle_at_25%_20%,_rgba(254,215,170,0.95),_transparent_36%),linear-gradient(135deg,_#1c1917,_#78350f)] p-5 text-white">
                  <div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] backdrop-blur">
                      {service.imageLabel}
                    </span>
                    <p className="mt-8 text-5xl font-black opacity-80">0{index + 1}</p>
                  </div>
                </div>
                <h3 className="text-2xl font-black">{service.name}</h3>
                <p className="mt-3 min-h-24 text-sm leading-6 text-stone-600">{service.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-5">
                  <span className="font-black text-amber-900">{formatPrice(service.priceCents)}</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold text-stone-700">
                    {service.durationMinutes} min
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="reservation" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-stone-950 p-8 text-white lg:p-10">
            <p className="font-black uppercase tracking-[0.22em] text-amber-300">Réservation</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Centralisez toutes les demandes clientes.
            </h2>
            <p className="mt-5 text-lg leading-8 text-stone-300">
              Le formulaire enregistre chaque demande en base PostgreSQL, vérifie que le créneau
              est libre et l’ajoute automatiquement au planning de gestion.
            </p>
            <div className="mt-8 grid gap-4">
              <FeatureLine title="Coordonnées" text="Nom, téléphone et email de la cliente." />
              <FeatureLine title="Créneau" text="Date future et horaires prédéfinis pour éviter les erreurs." />
              <FeatureLine title="Suivi" text="Statut en attente, confirmé, terminé ou annulé." />
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-950/5 sm:p-8">
            {currentMessage ? (
              <div className={`mb-6 rounded-3xl border p-4 ${currentMessage.className}`}>
                <p className="font-black">{currentMessage.title}</p>
                <p className="mt-1 text-sm">{currentMessage.body}</p>
              </div>
            ) : null}

            <form action={createAppointment} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nom complet">
                  <input
                    name="clientName"
                    required
                    minLength={2}
                    placeholder="Ex. Amina Diallo"
                    className="input"
                  />
                </Field>
                <Field label="Téléphone">
                  <input
                    name="clientPhone"
                    required
                    minLength={6}
                    placeholder="Ex. 06 12 34 56 78"
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  name="clientEmail"
                  type="email"
                  required
                  placeholder="cliente@email.com"
                  className="input"
                />
              </Field>

              <Field label="Service souhaité">
                <select name="serviceId" required defaultValue="" className="input">
                  <option value="" disabled>
                    Choisir une prestation
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {formatPrice(service.priceCents)} · {service.durationMinutes} min
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date">
                  <input name="appointmentDate" type="date" min={today} required className="input" />
                </Field>
                <Field label="Heure">
                  <select name="appointmentTime" required defaultValue="" className="input">
                    <option value="" disabled>
                      Choisir un horaire
                    </option>
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Longueur, état des locks, style souhaité, allergies..."
                  className="input resize-none"
                />
              </Field>

              <button
                type="submit"
                className="rounded-full bg-amber-800 px-7 py-4 font-black text-white shadow-xl shadow-amber-900/15 transition hover:-translate-y-0.5 hover:bg-stone-950"
              >
                Enregistrer le rendez-vous
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="planning" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.22em] text-amber-800">Back-office</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Planning des prochains rendez-vous
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniMetric label="Total" value={stats.total} />
              <MiniMetric label="En attente" value={stats.pending} />
              <MiniMetric label="Aujourd’hui" value={stats.today} />
              <MiniMetric label="CA terminé" value={formatPrice(stats.completedRevenueCents)} />
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-10 text-center">
              <p className="text-2xl font-black">Aucun rendez-vous à venir.</p>
              <p className="mt-3 text-stone-600">
                Utilisez le formulaire pour ajouter la première demande de réservation.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                      <div className="rounded-3xl bg-stone-950 px-5 py-4 text-center text-white">
                        <p className="text-sm font-bold text-amber-200">
                          {formatFrenchDate(appointment.appointmentDate)}
                        </p>
                        <p className="mt-1 text-3xl font-black">{appointment.appointmentTime}</p>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-black">{appointment.clientName}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClasses[appointment.status]}`}
                          >
                            {statusLabels[appointment.status]}
                          </span>
                        </div>
                        <p className="mt-2 font-bold text-amber-900">
                          {appointment.serviceName} · {appointment.serviceDuration} min ·{" "}
                          {formatPrice(appointment.servicePrice)}
                        </p>
                        <p className="mt-2 text-sm text-stone-600">
                          {appointment.clientPhone} · {appointment.clientEmail}
                        </p>
                        {appointment.notes ? (
                          <p className="mt-3 rounded-2xl bg-stone-50 p-3 text-sm text-stone-600">
                            {appointment.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <form action={updateAppointmentStatus} className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <select name="status" defaultValue={appointment.status} className="input min-w-44">
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-800"
                      >
                        Mettre à jour
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
    </div>
  );
}

function FeatureLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="font-black text-amber-200">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-300">{text}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-stone-800">
      {label}
      {children}
    </label>
  );
}
