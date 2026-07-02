import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Status = "pending" | "confirmed" | "completed" | "cancelled";

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
};

type Appointment = {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  serviceId: string;
  date: string;
  time: string;
  status: Status;
  notes: string;
};

type BookingForm = {
  clientName: string;
  phone: string;
  email: string;
  serviceId: string;
  date: string;
  time: string;
  notes: string;
};

type AuthSession = {
  token: string;
  username: string;
  mode: "api" | "demo";
};

type LoginResponse = {
  token: string;
  username: string;
};

const API_URL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL ||
  "http://localhost:4000";
const AUTH_STORAGE_KEY = "aissata-locks-auth";

const defaultServices: Service[] = [
  {
    id: "starter-locs",
    name: "Depart de locks",
    duration: 180,
    price: 120,
    description: "Diagnostic, tracage propre et depart au crochet ou twists.",
  },
  {
    id: "retwist",
    name: "Retwist + coiffure",
    duration: 120,
    price: 75,
    description: "Entretien des repousses, mise en forme et finition nette.",
  },
  {
    id: "repair",
    name: "Reparation locks",
    duration: 90,
    price: 55,
    description: "Renforcement, rattachement et correction de sections fragiles.",
  },
  {
    id: "wash-care",
    name: "Soin lavage detox",
    duration: 75,
    price: 45,
    description: "Nettoyage en profondeur, hydratation et conseils d'entretien.",
  },
];

const statusLabels: Record<Status, string> = {
  pending: "A confirmer",
  confirmed: "Confirme",
  completed: "Termine",
  cancelled: "Annule",
};

const statusStyles: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-900 ring-amber-200",
  confirmed: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  completed: "bg-stone-900 text-white ring-stone-900",
  cancelled: "bg-rose-100 text-rose-900 ring-rose-200",
};

const timeSlots = ["08:30", "09:30", "10:30", "11:30", "13:00", "14:00", "15:00", "16:00", "17:00"];

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getAppointmentDate(appointment: Appointment) {
  return new Date(`${appointment.date}T${appointment.time}:00`);
}

function serviceById(services: Service[], serviceId: string) {
  return services.find((service) => service.id === serviceId) ?? services[0];
}

function buildDemoAppointments(baseDate: Date): Appointment[] {
  const today = toISODate(baseDate);
  const tomorrow = toISODate(addDays(baseDate, 1));
  const nextWeek = toISODate(addDays(baseDate, 4));

  return [
    {
      id: "demo-1",
      clientName: "Maya Diallo",
      phone: "+33 6 19 40 28 10",
      email: "maya@example.com",
      serviceId: "retwist",
      date: today,
      time: "09:30",
      status: "confirmed",
      notes: "Prefere une finition simple, pas trop serree.",
    },
    {
      id: "demo-2",
      clientName: "Nora Bamba",
      phone: "+33 7 61 82 14 77",
      email: "nora@example.com",
      serviceId: "starter-locs",
      date: today,
      time: "14:00",
      status: "pending",
      notes: "Nouvelle cliente, demander photos avant le rendez-vous.",
    },
    {
      id: "demo-3",
      clientName: "Sofia Kante",
      phone: "+33 6 72 10 44 90",
      email: "sofia@example.com",
      serviceId: "wash-care",
      date: tomorrow,
      time: "11:30",
      status: "confirmed",
      notes: "Cuir chevelu sensible.",
    },
    {
      id: "demo-4",
      clientName: "Aminata Sy",
      phone: "+33 6 88 12 55 31",
      email: "aminata@example.com",
      serviceId: "repair",
      date: nextWeek,
      time: "16:00",
      status: "pending",
      notes: "Deux locks a rattacher sur le cote gauche.",
    },
  ];
}

function normalizeService(service: Service) {
  return {
    id: service.id,
    name: service.name,
    duration: Number(service.duration),
    price: Number(service.price),
    description: service.description,
  } satisfies Service;
}

function normalizeAppointment(appointment: Appointment) {
  return {
    id: appointment.id,
    clientName: appointment.clientName,
    phone: appointment.phone,
    email: appointment.email,
    serviceId: appointment.serviceId,
    date: appointment.date,
    time: appointment.time.slice(0, 5),
    status: appointment.status,
    notes: appointment.notes ?? "",
  } satisfies Appointment;
}

function readStoredSession() {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<AuthSession>;
    if (parsed.token && parsed.username && (parsed.mode === "api" || parsed.mode === "demo")) {
      return parsed as AuthSession;
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return null;
}

function storeSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export default function App() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => readStoredSession());
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [appointments, setAppointments] = useState<Appointment[]>(() => buildDemoAppointments(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [connectionMode, setConnectionMode] = useState<"api" | "demo" | "loading">("loading");
  const [notice, setNotice] = useState("Mode demonstration pret. Connectez PostgreSQL pour la persistance.");
  const [form, setForm] = useState<BookingForm>({
    clientName: "",
    phone: "",
    email: "",
    serviceId: defaultServices[0].id,
    date: today,
    time: "09:30",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    if (!authSession) {
      setConnectionMode("loading");
      return () => {
        isMounted = false;
      };
    }

    if (authSession.mode === "demo") {
      setConnectionMode("demo");
      setNotice("Mode demonstration : les donnees restent dans le navigateur.");
      return () => {
        isMounted = false;
      };
    }

    const activeSession = authSession;

    async function loadApiData() {
      try {
        const authHeaders = { Authorization: `Bearer ${activeSession.token}` };
        const [servicesResponse, appointmentsResponse] = await Promise.all([
          fetch(`${API_URL}/api/services`),
          fetch(`${API_URL}/api/appointments`, { headers: authHeaders }),
        ]);

        if (appointmentsResponse.status === 401) {
          throw new Error("unauthorized");
        }

        if (!servicesResponse.ok || !appointmentsResponse.ok) {
          throw new Error("API non disponible");
        }

        const servicesData = (await servicesResponse.json()) as Service[];
        const appointmentsData = (await appointmentsResponse.json()) as Appointment[];

        if (isMounted) {
          const nextServices = servicesData.map(normalizeService);
          setServices(nextServices.length > 0 ? nextServices : defaultServices);
          setAppointments(appointmentsData.map(normalizeAppointment));
          setConnectionMode("api");
          setNotice("Connecte au backend Express et a PostgreSQL.");
          setForm((current) => ({ ...current, serviceId: nextServices[0]?.id ?? current.serviceId }));
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof Error && error.message === "unauthorized") {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            setAuthSession(null);
            setNotice("Session expiree. Connectez-vous a nouveau.");
            return;
          }

          setConnectionMode("demo");
          setNotice("Backend indisponible : affichage local temporaire.");
        }
      }
    }

    loadApiData();

    return () => {
      isMounted = false;
    };
  }, [authSession]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((first, second) => getAppointmentDate(first).getTime() - getAppointmentDate(second).getTime());
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return sortedAppointments.filter((appointment) => {
      const matchesDate = appointment.date === selectedDate;
      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
      return matchesDate && matchesStatus;
    });
  }, [selectedDate, sortedAppointments, statusFilter]);

  const upcomingAppointments = useMemo(() => {
    return sortedAppointments.filter((appointment) => appointment.status !== "cancelled").slice(0, 5);
  }, [sortedAppointments]);

  const selectedDateLabel = dateFormatter.format(new Date(`${selectedDate}T12:00:00`));
  const activeRevenue = appointments.reduce((total, appointment) => {
    if (appointment.status === "cancelled") {
      return total;
    }
    return total + serviceById(services, appointment.serviceId).price;
  }, 0);
  const pendingCount = appointments.filter((appointment) => appointment.status === "pending").length;
  const todayCount = appointments.filter(
    (appointment) => appointment.date === today && appointment.status !== "cancelled",
  ).length;
  const isSlotTaken = appointments.some(
    (appointment) =>
      appointment.date === form.date && appointment.time === form.time && appointment.status !== "cancelled",
  );
  const canSubmit = Boolean(form.clientName.trim() && form.phone.trim() && form.serviceId && form.date && form.time && !isSlotTaken);

  async function loginWithApi(username: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Identifiants invalides ou API indisponible.");
    }

    const data = (await response.json()) as LoginResponse;
    const nextSession: AuthSession = { token: data.token, username: data.username, mode: "api" };
    storeSession(nextSession);
    setAuthSession(nextSession);
    setConnectionMode("loading");
    setNotice("Connexion pro reussie. Chargement de l'agenda...");
  }

  function loginInDemoMode() {
    const nextSession: AuthSession = { token: "demo", username: "Demo pro", mode: "demo" };
    storeSession(nextSession);
    setAuthSession(nextSession);
    setServices(defaultServices);
    setAppointments(buildDemoAppointments(new Date()));
    setConnectionMode("demo");
    setNotice("Mode demonstration : aucune donnee n'est envoyee au backend.");
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setConnectionMode("loading");
  }

  function authHeaders(): Record<string, string> {
    return authSession?.mode === "api" ? { Authorization: `Bearer ${authSession.token}` } : {};
  }

  function updateForm(field: keyof BookingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setNotice(isSlotTaken ? "Ce creneau est deja reserve." : "Completez les champs obligatoires.");
      return;
    }

    const optimisticAppointment: Appointment = {
      id: `local-${Date.now()}`,
      clientName: form.clientName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      serviceId: form.serviceId,
      date: form.date,
      time: form.time,
      status: "pending",
      notes: form.notes.trim(),
    };

    setAppointments((current) => [...current, optimisticAppointment]);
    setSelectedDate(form.date);
    setNotice("Rendez-vous ajoute a l'agenda.");
    setForm((current) => ({ ...current, clientName: "", phone: "", email: "", notes: "" }));

    if (connectionMode !== "api") {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(optimisticAppointment),
      });

      if (!response.ok) {
        throw new Error("creation impossible");
      }

      const persistedAppointment = normalizeAppointment((await response.json()) as Appointment);
      setAppointments((current) =>
        current.map((appointment) => (appointment.id === optimisticAppointment.id ? persistedAppointment : appointment)),
      );
    } catch {
      setConnectionMode("demo");
      setNotice("Le backend ne repond plus. Le rendez-vous reste disponible en local.");
    }
  }

  async function changeStatus(appointmentId: string, status: Status) {
    const previousAppointments = appointments;
    setAppointments((current) =>
      current.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status } : appointment)),
    );
    setNotice(`Statut mis a jour : ${statusLabels[status].toLowerCase()}.`);

    if (connectionMode !== "api") {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("mise a jour impossible");
      }
    } catch {
      setAppointments(previousAppointments);
      setConnectionMode("demo");
      setNotice("Mise a jour locale uniquement : backend indisponible.");
    }
  }

  if (!authSession) {
    return <AuthScreen onLogin={loginWithApi} onDemoLogin={loginInDemoMode} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#17120f] text-stone-100">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -left-24 top-8 h-96 w-96 rounded-full bg-amber-700/20 blur-3xl animate-breathe" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-rose-900/20 blur-3xl animate-breathe-delayed" />
      </div>

      <section className="relative grid min-h-screen lg:grid-cols-[0.9fr_1.25fr]">
        <aside className="relative hidden min-h-screen overflow-hidden lg:block">
          <img
            src="/images/locks-studio.jpg"
            alt="Tresseuse de locks dans un salon chaleureux"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#17120f]/40 via-[#17120f]/15 to-[#17120f]" />
          <div className="absolute inset-x-12 bottom-12 animate-rise space-y-5">
            <p className="text-sm uppercase tracking-[0.45em] text-amber-100/80">Studio de locks</p>
            <h1 className="max-w-xl text-6xl font-semibold leading-[0.92] tracking-[-0.06em] text-white">
              Aissata Locks Rendez-vous
            </h1>
            <p className="max-w-md text-lg leading-8 text-stone-200">
              Un agenda clair pour reserver, confirmer et suivre chaque soin de locks sans perdre le fil.
            </p>
          </div>
        </aside>

        <div className="relative z-10 flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-md">
            <a href="#agenda" className="text-base font-semibold tracking-tight text-white">
              Aissata Locks
            </a>
            <div className="hidden items-center gap-6 text-sm text-stone-300 sm:flex">
              <a className="transition hover:text-white" href="#agenda">
                Agenda
              </a>
              <a className="transition hover:text-white" href="#reservation">
                Reservation
              </a>
              <a className="transition hover:text-white" href="#services">
                Services
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`hidden rounded-full px-3 py-1 text-xs font-medium sm:inline-flex ${
                  connectionMode === "api" ? "bg-emerald-300 text-emerald-950" : "bg-amber-200 text-amber-950"
                }`}
              >
                {connectionMode === "loading" ? "Connexion..." : connectionMode === "api" ? "PostgreSQL actif" : "Mode demo"}
              </span>
              <span className="hidden text-xs text-stone-400 md:inline">{authSession.username}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-stone-200 transition hover:border-amber-100/50 hover:text-white"
              >
                Deconnexion
              </button>
            </div>
          </header>

          <div className="grid flex-1 content-center gap-7 py-8 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="animate-rise space-y-7" id="agenda">
              <div className="lg:hidden">
                <p className="text-sm uppercase tracking-[0.4em] text-amber-100/80">Studio de locks</p>
                <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-white">
                  Aissata Locks Rendez-vous
                </h1>
              </div>

              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.32em] text-amber-100/70">Tableau de bord</p>
                <h2 className="text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
                  Les rendez-vous du {selectedDateLabel}
                </h2>
                <p className="max-w-2xl text-base leading-7 text-stone-300">
                  Planifiez les soins, confirmez les clientes et gardez une vue nette sur les prestations a venir.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-stone-300 sm:grid-cols-3">
                <Metric label="Aujourd'hui" value={`${todayCount} rdv`} />
                <Metric label="A confirmer" value={String(pendingCount)} />
                <Metric label="Previsionnel" value={currencyFormatter.format(activeRevenue)} />
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="rounded-full border border-white/10 bg-[#241b16] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200"
                    />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as Status | "all")}
                      className="rounded-full border border-white/10 bg-[#241b16] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200"
                    >
                      <option value="all">Tous statuts</option>
                      <option value="pending">A confirmer</option>
                      <option value="confirmed">Confirmes</option>
                      <option value="completed">Termines</option>
                      <option value="cancelled">Annules</option>
                    </select>
                  </div>
                  <p className="text-sm text-stone-400">{notice}</p>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((appointment, index) => (
                      <AppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                        index={index}
                        service={serviceById(services, appointment.serviceId)}
                        onStatusChange={changeStatus}
                      />
                    ))
                  ) : (
                    <div className="flex min-h-52 items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 text-center text-stone-400">
                      Aucun rendez-vous sur ce filtre. Ajoutez une reservation a droite.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:self-center" id="reservation">
              <form
                onSubmit={handleSubmit}
                className="animate-rise-delayed rounded-[2rem] border border-amber-100/15 bg-amber-50 p-5 text-stone-950 shadow-2xl shadow-black/30 sm:p-6"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-stone-500">Nouvelle reservation</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Bloquer un creneau</h2>
                  </div>
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white">Client</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom complet" className="sm:col-span-2">
                    <input
                      value={form.clientName}
                      onChange={(event) => updateForm("clientName", event.target.value)}
                      placeholder="Ex: Fatou Ndiaye"
                      className="input-light"
                    />
                  </Field>
                  <Field label="Telephone">
                    <input
                      value={form.phone}
                      onChange={(event) => updateForm("phone", event.target.value)}
                      placeholder="+33 6 ..."
                      className="input-light"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateForm("email", event.target.value)}
                      placeholder="cliente@email.com"
                      className="input-light"
                    />
                  </Field>
                  <Field label="Prestation" className="sm:col-span-2">
                    <select
                      value={form.serviceId}
                      onChange={(event) => updateForm("serviceId", event.target.value)}
                      className="input-light"
                    >
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {service.duration} min - {currencyFormatter.format(service.price)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => updateForm("date", event.target.value)}
                      className="input-light"
                    />
                  </Field>
                  <Field label="Heure">
                    <select value={form.time} onChange={(event) => updateForm("time", event.target.value)} className="input-light">
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      placeholder="Longueur, sensibilites, acompte, photos a demander..."
                      className="input-light min-h-24 resize-none"
                    />
                  </Field>
                </div>

                {isSlotTaken && (
                  <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-900">
                    Ce creneau est deja occupe. Choisissez une autre heure.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-5 w-full rounded-full bg-stone-950 px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  Enregistrer le rendez-vous
                </button>
              </form>

              <div className="animate-rise-delayed rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl" id="services">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Prochains passages</h2>
                  <span className="text-sm text-stone-400">{upcomingAppointments.length} actifs</span>
                </div>
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => {
                    const service = serviceById(services, appointment.serviceId);
                    return (
                      <div key={appointment.id} className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                        <div>
                          <p className="font-medium text-white">{appointment.clientName}</p>
                          <p className="text-sm text-stone-400">
                            {service.name} - {dateFormatter.format(new Date(`${appointment.date}T12:00:00`))} a {appointment.time}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-amber-100">{currencyFormatter.format(service.price)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthScreen({
  onLogin,
  onDemoLogin,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  onDemoLogin: () => void;
}) {
  const [username, setUsername] = useState("pro");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#17120f] text-stone-100">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -left-24 top-8 h-96 w-96 rounded-full bg-amber-700/20 blur-3xl animate-breathe" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-rose-900/20 blur-3xl animate-breathe-delayed" />
      </div>

      <section className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden min-h-screen overflow-hidden lg:block">
          <img
            src="/images/locks-studio.jpg"
            alt="Tresseuse de locks dans un salon chaleureux"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#17120f]/20 via-[#17120f]/30 to-[#17120f]" />
          <div className="absolute inset-x-12 bottom-12 animate-rise space-y-5">
            <p className="text-sm uppercase tracking-[0.45em] text-amber-100/80">Espace pro securise</p>
            <h1 className="max-w-xl text-6xl font-semibold leading-[0.92] tracking-[-0.06em] text-white">
              Aissata Locks Rendez-vous
            </h1>
            <p className="max-w-md text-lg leading-8 text-stone-200">
              Connectez-vous pour acceder a l'agenda, aux clientes et au suivi des prestations.
            </p>
          </div>
        </aside>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <form
            onSubmit={handleLogin}
            className="animate-rise w-full max-w-md rounded-[2rem] border border-amber-100/15 bg-amber-50 p-6 text-stone-950 shadow-2xl shadow-black/30"
          >
            <p className="text-sm uppercase tracking-[0.28em] text-stone-500">Connexion professionnelle</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Acceder a l'agenda</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Les rendez-vous PostgreSQL sont proteges par un jeton signe cote backend.
            </p>

            <div className="mt-6 space-y-4">
              <Field label="Identifiant">
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="input-light"
                  autoComplete="username"
                />
              </Field>
              <Field label="Mot de passe">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-light"
                  autoComplete="current-password"
                />
              </Field>
            </div>

            {error && <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-900">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !password}
              className="mt-5 w-full rounded-full bg-stone-950 px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>

            <button
              type="button"
              onClick={onDemoLogin}
              className="mt-3 w-full rounded-full border border-stone-950/15 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-950/40 hover:text-stone-950"
            >
              Voir une demo hors ligne
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block space-y-2 text-sm font-medium text-stone-700 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function AppointmentRow({
  appointment,
  service,
  index,
  onStatusChange,
}: {
  appointment: Appointment;
  service: Service;
  index: number;
  onStatusChange: (appointmentId: string, status: Status) => void;
}) {
  return (
    <article className="animate-list-in rounded-[1.6rem] border border-white/10 bg-[#211914]/90 p-4" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="grid gap-4 md:grid-cols-[5.5rem_1fr_auto] md:items-center">
        <div className="rounded-2xl bg-amber-100 px-4 py-3 text-center text-stone-950">
          <p className="text-2xl font-semibold leading-none">{appointment.time}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-600">{service.duration} min</p>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">{appointment.clientName}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusStyles[appointment.status]}`}>
              {statusLabels[appointment.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-300">
            {service.name} - {currencyFormatter.format(service.price)} - {appointment.phone}
          </p>
          {appointment.notes && <p className="mt-2 text-sm leading-6 text-stone-400">{appointment.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button className="status-button" onClick={() => onStatusChange(appointment.id, "confirmed")} type="button">
            Confirmer
          </button>
          <button className="status-button" onClick={() => onStatusChange(appointment.id, "completed")} type="button">
            Terminer
          </button>
          <button className="status-button danger" onClick={() => onStatusChange(appointment.id, "cancelled")} type="button">
            Annuler
          </button>
        </div>
      </div>
    </article>
  );
}