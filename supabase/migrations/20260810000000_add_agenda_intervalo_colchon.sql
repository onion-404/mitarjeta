-- ============================================================================
-- Migración: intervalo entre horarios ofrecidos (por tarjeta) + colchón
-- entre citas (por SERVICIO, no por tarjeta — pedido explícito del cliente:
-- distintos servicios de la misma tarjeta pueden necesitar más o menos
-- espacio entre sesiones). Antes: paso fijo de 15 min hardcodeado en
-- lib/agenda.ts, sin ningún colchón entre una cita y la siguiente.
--
-- Motivo: un servicio de 60 min ofrecía un horario de inicio cada 15 min
-- (09:00, 09:15, 09:30...) — matemáticamente correcto (nunca se ofrece un
-- horario que no entre en la ventana de disponibilidad), pero generaba una
-- lista de opciones casi idénticas para servicios largos, y no dejaba
-- espacio de preparación/traslado entre una cita y la próxima.
--
-- 100% ADITIVA: solo ALTER TABLE ... ADD COLUMN con DEFAULT (no rompe
-- ninguna fila existente) y CREATE OR REPLACE FUNCTION (mismo nombre que ya
-- existe; el único caller, src/app/api/citas/route.ts, se actualiza en el
-- mismo commit para pasar el nuevo parámetro).
-- ============================================================================

begin;

alter table public.tarjetas
  add column if not exists intervalo_agenda_minutos integer not null default 15
    check (intervalo_agenda_minutos > 0);

comment on column public.tarjetas.intervalo_agenda_minutos is
  'Cada cuántos minutos se ofrece un horario de inicio dentro de una ventana disponible (ver lib/agenda.ts, PASO_MINUTOS pasó a leerse de acá). Default 15 = comportamiento de siempre.';

alter table public.servicios_agendables
  add column if not exists colchon_minutos integer not null default 0
    check (colchon_minutos >= 0);

comment on column public.servicios_agendables.colchon_minutos is
  'Minutos de colchón antes/después de UNA cita de este servicio durante los cuales no se ofrece ni se permite agendar otra — por servicio, no por tarjeta (distintos servicios pueden necesitar distinto espacio). Default 0 = sin colchón (comportamiento de siempre).';

-- existe_solapamiento_cita gana `p_colchon_minutos` (el colchón del
-- SERVICIO que se está por agendar, ya en mano del caller — ver
-- api/citas/route.ts) — para cada cita ya ocupada se usa el MAYOR entre su
-- propio colchón (join contra servicios_agendables) y el de la cita nueva,
-- así cualquiera de los dos servicios involucrados que pida más espacio es
-- el que manda. Con `p_colchon_minutos = 0` y ningún servicio con colchón
-- configurado, el resultado es IDÉNTICO al de antes de esta migración.
create or replace function public.existe_solapamiento_cita(
  p_tarjeta_id uuid,
  p_fecha_hora_inicio timestamptz,
  p_fecha_hora_fin timestamptz,
  p_colchon_minutos integer default 0,
  p_excluir_cita_id uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.citas c
    join public.servicios_agendables s on s.id = c.servicio_id
    where c.tarjeta_id = p_tarjeta_id
      and c.estado in ('confirmada', 'pagada')
      and (p_excluir_cita_id is null or c.id <> p_excluir_cita_id)
      and c.fecha_hora_inicio - (greatest(s.colchon_minutos, p_colchon_minutos) || ' minutes')::interval < p_fecha_hora_fin
      and c.fecha_hora_fin + (greatest(s.colchon_minutos, p_colchon_minutos) || ' minutes')::interval > p_fecha_hora_inicio
  );
$$;

commit;
