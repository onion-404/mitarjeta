-- ============================================================================
-- Migración: `tarjetas.verificado` — check de verificación exclusivo del
-- panel admin (ver src/app/api/admin/verificar-tarjeta/route.ts y
-- src/app/admin/tarjetas/[id]/page.tsx). El dueño de la tarjeta NO puede
-- tocar este campo desde su propio editor (no vive en `identidad_visual`,
-- que sí controla el dueño) — se escribe siempre con el service role desde
-- la API route, gateada por ADMIN_EMAIL, nunca desde el cliente directo.
--
-- `not null default false`: ninguna tarjeta existente aparece verificada al
-- correr esta migración (Postgres backfillea el default en una sola pasada,
-- sin bloquear de más en versiones modernas).
--
-- Sin cambios de RLS: la lectura pública ya pasa por `select("*")` sobre las
-- policies existentes de `tarjetas` (RLS es a nivel de FILA, no de columna
-- — una columna nueva en una fila ya legible no necesita policy propia). La
-- escritura sale siempre por el service role (bypassea RLS), tampoco
-- necesita policy nueva.
-- ============================================================================

begin;

alter table public.tarjetas
  add column if not exists verificado boolean not null default false;

comment on column public.tarjetas.verificado is
  'Check de verificación (ícono junto al @slug en la tarjeta pública) — exclusivo del panel admin, el dueño no lo puede activar desde su editor. Default false.';

commit;
