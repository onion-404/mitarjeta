-- ============================================================================
-- Migración: tabla `testimonios` — CLAUDE.md decía que ya existía ("seed con
-- 2 placeholders") pero se confirmó contra producción que nunca se creó
-- (PGRST205: Could not find the table 'public.testimonios'). Esta migración
-- la crea de verdad, de cero, sin datos placeholder (el cliente pidió
-- testimonios reales gestionados desde el admin, no seed falso).
--
-- 100% ADITIVA: tabla nueva, sin tocar ninguna existente.
-- ============================================================================

begin;

create table if not exists public.testimonios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rol_o_negocio text not null,
  cita text not null,
  avatar_url text,
  calificacion smallint check (calificacion is null or calificacion between 1 and 5),
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.testimonios.rol_o_negocio is
  'Texto libre, ej. "Dueña de estudio de yoga" — no un enum, cada negocio se describe distinto.';
comment on column public.testimonios.calificacion is
  'Null = no se muestran estrellas para este testimonio. 1-5 si sí.';
comment on column public.testimonios.orden is
  'Orden manual de despliegue en el home (asc). Se reasigna por intercambio entre vecinos al reordenar desde el admin, no hay gap-filling automático.';

alter table public.testimonios enable row level security;

-- Select público sin filtrar por `activo` a nivel de RLS — mismo criterio
-- que ya usa `planes_select_publica` (planes.ts filtra `.eq("activo", true)`
-- en la query, no en la policy). Consistente con el resto del proyecto:
-- catálogos públicos usan RLS permisivo + filtro de aplicación.
create policy "testimonios_select_publica"
  on public.testimonios for select
  using (true);

create policy "testimonios_admin_todo"
  on public.testimonios for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

commit;
