-- ============================================================================
-- Migración: tarjeta_slug_historial — audita cada cambio de `tarjetas.slug`
-- (el "enlace personalizado"/username de la tarjeta) y hace cumplir el
-- límite de negocio "máximo 2 cambios cada 14 días" a nivel de base de
-- datos, no solo en el cliente.
--
-- Contexto: hasta ahora el slug solo se podía elegir UNA vez, al crear la
-- tarjeta — `TarjetaForm` en modo edición nunca mandaba `slug` en el
-- UPDATE. Se vuelve editable siempre (pedido explícito, ver CLAUDE.md), con
-- verificación de disponibilidad en vivo (ya existía para creación, se
-- reusa) + este límite nuevo para evitar spam de cambios (rompe enlaces ya
-- compartidos/impresos, indexación de buscadores, etc.).
--
-- Por qué a nivel de trigger y no solo en TarjetaForm: la tarjeta se
-- actualiza con `supabase.from("tarjetas").update(...)` DIRECTO desde el
-- cliente autenticado (RLS `tarjetas_owner_todo`, sin endpoint server-side
-- propio — mismo patrón que ya usa el resto del editor, ver
-- agenda-servicios.tsx). Sin un trigger, el límite sería puramente
-- decorativo: cualquiera podría llamar `.update({slug})` repetidas veces
-- saltándose la UI. El trigger BEFORE UPDATE lo hace imposible de
-- bypassear, sea cual sea el cliente que dispare el UPDATE.
--
-- Mismo patrón ya validado en el proyecto para tablas de auditoría
-- (suscripciones_historial, cupon_usos): tabla append-only, poblada solo
-- por un trigger — sin policy de insert/update/delete para
-- anon/authenticated, así que el trigger necesita `security definer` para
-- poder escribir pese a que quien dispara el UPDATE es el usuario dueño
-- (rol "authenticated", sin grant directo sobre esta tabla) — mismo
-- criterio ya usado en fn_cupon_es_valido/fn_cupon_usos_restantes.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Tabla tarjeta_slug_historial
-- ----------------------------------------------------------------------------
create table if not exists public.tarjeta_slug_historial (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  slug_anterior text not null,
  slug_nuevo text not null,
  created_at timestamptz not null default now()
);

-- Para "cuántos cambios tuvo esta tarjeta en los últimos 14 días" (el
-- chequeo del trigger) y "cuál es el más viejo de esa ventana" (para
-- calcular cuándo se libera el próximo cambio, en la UI).
create index if not exists tarjeta_slug_historial_tarjeta_fecha_idx
  on public.tarjeta_slug_historial (tarjeta_id, created_at desc);

alter table public.tarjeta_slug_historial enable row level security;

-- El dueño puede LEER su propio historial (para mostrar "te quedan N
-- cambios" en el editor) pero no puede insertar/editar/borrar directo —
-- solo el trigger (security definer) escribe acá, mismo criterio que
-- cupon_usos/suscripciones_historial.
create policy "tarjeta_slug_historial_select_propia"
  on public.tarjeta_slug_historial for select
  using (
    exists (
      select 1 from public.tarjetas t
      where t.id = tarjeta_slug_historial.tarjeta_id
        and t.user_id = auth.uid()
    )
  );

create policy "tarjeta_slug_historial_admin_todo"
  on public.tarjeta_slug_historial for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 2) Trigger BEFORE UPDATE: bloquea el UPDATE si ya hubo 2+ cambios de slug
--    en los últimos 14 días — corre ANTES de que el cambio se aplique, así
--    que un intento bloqueado no deja ningún rastro (ni en `tarjetas` ni en
--    el historial).
-- ----------------------------------------------------------------------------
create or replace function public.fn_validar_limite_cambio_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cambios_recientes integer;
begin
  if new.slug is distinct from old.slug then
    select count(*) into v_cambios_recientes
    from public.tarjeta_slug_historial
    where tarjeta_id = new.id
      and created_at > now() - interval '14 days';

    if v_cambios_recientes >= 2 then
      raise exception 'limite_cambio_slug_alcanzado'
        using errcode = 'P0001',
              hint = 'Máximo 2 cambios de enlace cada 14 días.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_limite_cambio_slug on public.tarjetas;
create trigger trg_validar_limite_cambio_slug
  before update on public.tarjetas
  for each row execute function public.fn_validar_limite_cambio_slug();

-- ----------------------------------------------------------------------------
-- 3) Trigger AFTER UPDATE: registra el cambio ya aplicado (solo llega acá
--    si el trigger de arriba no lo bloqueó).
-- ----------------------------------------------------------------------------
create or replace function public.fn_registrar_cambio_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is distinct from old.slug then
    insert into public.tarjeta_slug_historial (tarjeta_id, slug_anterior, slug_nuevo)
    values (new.id, old.slug, new.slug);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_cambio_slug on public.tarjetas;
create trigger trg_registrar_cambio_slug
  after update on public.tarjetas
  for each row execute function public.fn_registrar_cambio_slug();

commit;

-- Verificación sugerida después de aplicar (no forma parte de la migración):
-- 1) select trigger_name from information_schema.triggers
--    where event_object_table = 'tarjetas';
--    Esperado: incluye trg_validar_limite_cambio_slug y trg_registrar_cambio_slug.
-- 2) Con una tarjeta de prueba: cambiar el slug 2 veces seguidas (debe
--    funcionar), al 3er intento dentro de 14 días debe fallar con un error
--    que incluya "limite_cambio_slug_alcanzado".
-- 3) select * from tarjeta_slug_historial where tarjeta_id = '<id>';
--    Esperado: 2 filas (no 3 — el intento bloqueado no debe dejar rastro).
