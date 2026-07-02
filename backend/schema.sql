create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
  end if;
end
$$;

create table if not exists services (
  id text primary key,
  name text not null unique,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  description text,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  service_id text not null references services(id),
  appointment_date date not null,
  appointment_time time not null,
  status appointment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table appointments drop constraint if exists appointments_unique_active_slot;

create index if not exists appointments_date_status_idx on appointments (appointment_date, status);
create index if not exists appointments_client_idx on appointments (client_id);
create unique index if not exists appointments_unique_active_slot_idx
  on appointments (appointment_date, appointment_time)
  where status <> 'cancelled';

insert into services (id, name, duration_minutes, price_cents, description, sort_order)
values
  ('starter-locs', 'Depart de locks', 180, 12000, 'Diagnostic, tracage propre et depart au crochet ou twists.', 10),
  ('retwist', 'Retwist + coiffure', 120, 7500, 'Entretien des repousses, mise en forme et finition nette.', 20),
  ('repair', 'Reparation locks', 90, 5500, 'Renforcement, rattachement et correction de sections fragiles.', 30),
  ('wash-care', 'Soin lavage detox', 75, 4500, 'Nettoyage en profondeur, hydratation et conseils d''entretien.', 40)
on conflict (id) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

insert into clients (full_name, phone, email)
values
  ('Maya Diallo', '+33 6 19 40 28 10', 'maya@example.com'),
  ('Nora Bamba', '+33 7 61 82 14 77', 'nora@example.com')
on conflict (phone) do nothing;

insert into appointments (client_id, service_id, appointment_date, appointment_time, status, notes)
select c.id, 'retwist', current_date, '09:30', 'confirmed', 'Prefere une finition simple, pas trop serree.'
from clients c
where c.phone = '+33 6 19 40 28 10'
on conflict do nothing;

insert into appointments (client_id, service_id, appointment_date, appointment_time, status, notes)
select c.id, 'starter-locs', current_date, '14:00', 'pending', 'Nouvelle cliente, demander photos avant le rendez-vous.'
from clients c
where c.phone = '+33 7 61 82 14 77'
on conflict do nothing;