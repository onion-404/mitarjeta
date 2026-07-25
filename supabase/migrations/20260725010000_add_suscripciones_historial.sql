-- ============================================================================
-- Migración: suscripciones_historial — log append-only de transiciones de
-- estado de `suscripciones`, para poder calcular churn (cancelaciones) por
-- período en el dashboard admin.
--
-- Contexto: `suscripciones.estado` es last-write-wins (columna simple +
-- `updated_at`, sin historial propio) — no hay forma de reconstruir con
-- precisión cuántas suscripciones estaban 'autorizada' al INICIO de un
-- período pasado si alguna de ellas canceló DURANTE ese período (su
-- `estado` actual ya no dice nada sobre el pasado), ni de distinguir una
-- suscripción que canceló directo de una que pasó por 'pausada' antes.
-- `suscripciones_historial` resuelve esto hacia adelante: cada UPDATE que
-- cambia `estado` queda registrado con estado_anterior/estado_nuevo/fecha,
-- vía un trigger AFTER UPDATE — mismo patrón que ya usa el rollup de
-- `eventos_metricas` → `metricas_diarias` (fn_registrar_metrica_diaria /
-- trg_eventos_metricas_rollup en 20260716120000_add_planes_suscripciones_metricas.sql).
--
-- LIMITACIÓN ACEPTADA, documentada también en CLAUDE.md: el churn calculado
-- con esta tabla solo es preciso a partir de que esta migración se aplique
-- en producción — no es retroactivo. Las transiciones de estado que ya
-- ocurrieron ANTES de aplicar esta migración no dejaron rastro en ningún
-- lado y no se pueden reconstruir. Para darle al dashboard un punto de
-- partida conocido (en vez de arrancar completamente vacío), esta migración
-- hace un backfill de UNA fila por cada suscripción existente hoy,
-- representando su estado actual como el primer punto conocido de su
-- historial (estado_anterior null, estado_nuevo = su estado actual,
-- created_at = ahora). No es una reconstrucción de transiciones pasadas
-- reales, es solo el punto de anclaje "esto es lo que sabemos que es cierto
-- desde este momento en adelante".
--
-- No toca la tabla `suscripciones` en sí (ninguna columna nueva, ningún
-- cambio de policy sobre ella) — 100% aditiva: tabla nueva + función +
-- trigger + backfill.
--
-- El trigger corre siempre en el contexto del cliente de service role
-- (único que puede hacer UPDATE sobre `suscripciones`, ver
-- confirmar-suscripcion.ts / confirmar-suscripcion-stripe.ts — no hay
-- policy de update para anon/authenticated), que ya bypassea RLS por sí
-- solo — no hace falta `security definer` en la función del trigger, mismo
-- criterio que ya usa fn_registrar_metrica_diaria.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Tabla suscripciones_historial
-- ----------------------------------------------------------------------------
create table if not exists public.suscripciones_historial (
  id uuid primary key default gen_random_uuid(),
  suscripcion_id uuid not null references public.suscripciones(id) on delete cascade,
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  estado_anterior text,
  estado_nuevo text not null,
  created_at timestamptz not null default now()
);

create index if not exists suscripciones_historial_suscripcion_id_idx
  on public.suscripciones_historial (suscripcion_id);

-- Para el cálculo de churn por período admin: "transiciones a estado
-- terminal en un rango de fechas" y "última transición conocida antes de
-- una fecha dada" (para inferir si una suscripción estaba 'autorizada' al
-- inicio del período).
create index if not exists suscripciones_historial_estado_nuevo_fecha_idx
  on public.suscripciones_historial (estado_nuevo, created_at desc);

create index if not exists suscripciones_historial_suscripcion_fecha_idx
  on public.suscripciones_historial (suscripcion_id, created_at desc);

alter table public.suscripciones_historial enable row level security;

-- Solo lectura admin: es una tabla de analítica interna, no algo que el
-- dueño de la tarjeta necesite ver (ya ve el estado actual de su propia
-- suscripción en `suscripciones`, con su policy `suscripciones_select_propia`
-- de siempre). Sin policy de insert/update/delete para anon/authenticated
-- a propósito — solo el trigger (bajo service role) escribe acá.
create policy "suscripciones_historial_admin_todo"
  on public.suscripciones_historial for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 2) Trigger: registra cada transición real de estado (ignora updates que
--    no cambian `estado`, ej. solo actualizar fecha_renovacion).
-- ----------------------------------------------------------------------------
create or replace function public.fn_registrar_transicion_suscripcion()
returns trigger
language plpgsql
as $$
begin
  if new.estado is distinct from old.estado then
    insert into public.suscripciones_historial (suscripcion_id, tarjeta_id, estado_anterior, estado_nuevo)
    values (new.id, new.tarjeta_id, old.estado, new.estado);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_suscripciones_historial on public.suscripciones;
create trigger trg_suscripciones_historial
  after update on public.suscripciones
  for each row execute function public.fn_registrar_transicion_suscripcion();

-- ----------------------------------------------------------------------------
-- 3) Backfill: un punto de anclaje por cada suscripción existente, con su
--    estado actual — ver nota de LIMITACIÓN ACEPTADA arriba.
-- ----------------------------------------------------------------------------
insert into public.suscripciones_historial (suscripcion_id, tarjeta_id, estado_anterior, estado_nuevo, created_at)
select id, tarjeta_id, null, estado, now()
from public.suscripciones;

commit;
