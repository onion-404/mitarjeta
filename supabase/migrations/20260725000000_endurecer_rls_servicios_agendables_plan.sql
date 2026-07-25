-- ============================================================================
-- Migración: endurecer las policies de lectura pública de la agenda
-- (servicios_agendables, disponibilidad_semanal, disponibilidad_excepciones)
-- para exigir plan_id IS NOT NULL a nivel de RLS, no solo como filtro de
-- aplicación.
--
-- Contexto: getServiciosAgendablesActivos() (src/lib/tarjetas.ts) ya filtra
-- `tarjetas.plan_id IS NOT NULL` con un !inner join antes de devolver
-- servicios a la vista pública, pero las tres policies en sí (creadas en
-- 20260717100000_add_agenda_servicios.sql) solo exigían `publicado = true`.
-- Eso dejaba la protección dependiendo por completo de que esa función sea
-- el único camino de lectura pública — cualquier otra consulta directa
-- (anon/authenticated) a cualquiera de las tres tablas seguía pudiendo leer
-- datos de agenda de una tarjeta sin plan activo (nunca pagó, o se le
-- pausó/canceló la suscripción): no solo los servicios en sí, también su
-- horario recurrente y sus excepciones puntuales. Mismo patrón que ya usan
-- las tres policies con `publicado`: el requisito se mueve al
-- `exists (... from tarjetas t ...)`.
--
-- 100% ADITIVA en el sentido de que no toca ninguna tabla ni columna, solo
-- reemplaza tres policies existentes (drop + create cada una, Postgres no
-- soporta `create or replace policy`). No cambia las policies `_owner_todo`
-- ni `_admin_todo` de ninguna de las tres tablas: el dueño y el admin deben
-- poder seguir viendo/editando su agenda aunque el plan esté vencido (para
-- poder reactivarlo o revisar su configuración), el bloqueo es solo para la
-- lectura pública anónima.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) servicios_agendables
-- ----------------------------------------------------------------------------
drop policy if exists "servicios_agendables_select_publica" on public.servicios_agendables;

create policy "servicios_agendables_select_publica"
  on public.servicios_agendables for select
  using (
    activo = true
    and exists (
      select 1 from public.tarjetas t
      where t.id = tarjeta_id
        and t.publicado = true
        and t.plan_id is not null
    )
  );

-- ----------------------------------------------------------------------------
-- 2) disponibilidad_semanal
-- ----------------------------------------------------------------------------
drop policy if exists "disponibilidad_semanal_select_publica" on public.disponibilidad_semanal;

create policy "disponibilidad_semanal_select_publica"
  on public.disponibilidad_semanal for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id
      and t.publicado = true
      and t.plan_id is not null
  ));

-- ----------------------------------------------------------------------------
-- 3) disponibilidad_excepciones
-- ----------------------------------------------------------------------------
drop policy if exists "disponibilidad_excepciones_select_publica" on public.disponibilidad_excepciones;

create policy "disponibilidad_excepciones_select_publica"
  on public.disponibilidad_excepciones for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id
      and t.publicado = true
      and t.plan_id is not null
  ));

commit;
