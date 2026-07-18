-- ============================================================================
-- Migración: plan por defecto para tarjetas nuevas + zona horaria por
-- tarjeta (necesaria para que la agenda de servicios convierta horarios
-- locales del dueño <-> UTC correctamente).
--
-- 100% ADITIVA:
--   - 1 ALTER COLUMN SET DEFAULT (metadata-only, no reescribe filas).
--   - 1 UPDATE puntual de backfill sobre `plan_id` (columna ya nullable, no
--     se agrega ningún NOT NULL nuevo sobre datos existentes).
--   - 1 ALTER TABLE ADD COLUMN NOT NULL DEFAULT (mismo patrón ya usado para
--     configuracion.descuento_tarjeta_adicional_pct: Postgres rellena el
--     default en las filas existentes al agregar la columna).
--
-- Generada: 2026-07-17. Producción, sin ambiente de staging separado.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Plan por defecto — ninguna tarjeta nueva debe quedar con plan_id null.
--    DEFAULT en vez de trigger: más simple y alcanza, porque ningún insert
--    de la app hoy asigna plan_id explícitamente (queda con DEFAULT en todos
--    los inserts existentes en tarjeta-form.tsx). Es el mecanismo de
--    asignación automática MIENTRAS `suscripciones` no esté implementado;
--    cuando exista, ese flujo actualizará plan_id en upgrades/downgrades sin
--    reemplazar este default (una tarjeta nueva sigue arrancando en
--    "presencia" hasta que se suscriba a otro plan).
-- ----------------------------------------------------------------------------
create or replace function public.plan_id_por_defecto()
returns uuid
language sql
stable
as $$
  select id from public.planes where slug = 'presencia' limit 1;
$$;

alter table public.tarjetas
  alter column plan_id set default public.plan_id_por_defecto();

-- Backfill: tarjetas ya existentes (las de prueba, previas a esta feature)
-- que hayan quedado con plan_id null.
update public.tarjetas
set plan_id = public.plan_id_por_defecto()
where plan_id is null;

-- ----------------------------------------------------------------------------
-- 2) Zona horaria por tarjeta — disponibilidad_semanal/disponibilidad_
--    excepciones se definen en la hora local del dueño, no en UTC. Formato
--    IANA (America/Mexico_City, Europe/Madrid, etc.) para soportar
--    cualquier país futuro sin rediseño de schema.
-- ----------------------------------------------------------------------------
alter table public.tarjetas
  add column if not exists zona_horaria text not null default 'America/Mexico_City'
    check (zona_horaria <> '');

commit;
