-- ============================================================================
-- Migración: sistema de cupones avanzado — seguimiento de afiliados,
-- vencimiento, límite de usos, y tabla de auditoría de uso (cupon_usos).
--
-- 100% ADITIVA: nuevas columnas nullable en `cupones`, tabla nueva
-- `cupon_usos`, una función nueva de validación centralizada. No se toca
-- `suscripciones.cupon_codigo` (sigue siendo texto plano a propósito,
-- confirmado que no tiene FK y así debe seguir).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) cupones: campos nuevos para afiliados, vencimiento y límite de usos.
-- ----------------------------------------------------------------------------
alter table public.cupones
  add column if not exists afiliado_nombre text,
  add column if not exists fecha_vencimiento timestamptz,
  add column if not exists limite_usos integer check (limite_usos is null or limite_usos > 0);

comment on column public.cupones.afiliado_nombre is
  'Nombre del afiliado/partner al que se le atribuye este código, para reporting. Null = cupón interno sin afiliado.';
comment on column public.cupones.fecha_vencimiento is
  'Null = sin vencimiento. Pasada esa fecha, fn_cupon_es_valido() lo rechaza aunque activo=true.';
comment on column public.cupones.limite_usos is
  'Null = sin límite. Se cuenta contra filas reales en cupon_usos, no un contador cacheado.';

-- ----------------------------------------------------------------------------
-- 2) cupon_usos: auditoría de cada uso exitoso.
--
--    Las tres FK (cupon_id, tarjeta_id, suscripcion_id) son NULLABLE con
--    "on delete set null" — ninguna borra la fila en cascada. Si se borra
--    el cupón, la tarjeta, o se cancela y luego se borra la suscripción
--    (cualquier combinación, en cualquier orden, meses después), la fila
--    de cupon_usos sobrevive con la FK correspondiente en null — nunca se
--    pierde el registro de que ese código generó esa venta. El snapshot
--    (codigo, afiliado_nombre, monto_descontado, precio_final) es lo que
--    hace que la fila siga siendo útil para reporting de afiliados aunque
--    las tres FK terminen en null a la vez.
--
--    cupon_id es bigint (no uuid): confirmado con una query real contra
--    producción (introspección OpenAPI de PostgREST +
--    select id from cupones) que cupones.id es bigint — a diferencia de
--    tarjetas.id/suscripciones.id, que sí son uuid (gen_random_uuid()).
--    No es el mismo tipo de PK en las tres tablas.
-- ----------------------------------------------------------------------------
create table if not exists public.cupon_usos (
  id uuid primary key default gen_random_uuid(),
  cupon_id bigint references public.cupones(id) on delete set null,
  tarjeta_id uuid references public.tarjetas(id) on delete set null,
  suscripcion_id uuid references public.suscripciones(id) on delete set null,
  -- Snapshot al momento del uso (confirmación de pago vía webhook, ver
  -- procesarSuscripcionStripe en confirmar-suscripcion-stripe.ts) —
  -- congelado ACÁ para que sobreviva aunque las tres FK de arriba se
  -- vuelvan null.
  codigo text not null,
  afiliado_nombre text,
  monto_descontado numeric not null,
  precio_final numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists cupon_usos_cupon_id_idx on public.cupon_usos (cupon_id);
create index if not exists cupon_usos_codigo_idx on public.cupon_usos (codigo);
create index if not exists cupon_usos_afiliado_idx on public.cupon_usos (afiliado_nombre)
  where afiliado_nombre is not null;
create index if not exists cupon_usos_suscripcion_id_idx on public.cupon_usos (suscripcion_id);

alter table public.cupon_usos enable row level security;

-- Solo el admin lee esto (métricas de afiliados) — igual que
-- suscripciones_historial. Solo el service role (webhook de confirmación)
-- inserta.
create policy "cupon_usos_admin_todo"
  on public.cupon_usos for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 3) fn_cupon_es_valido: única fuente de verdad para "¿este código sirve
--    hoy?" (activo + no vencido + no alcanzó su límite de usos real).
--    security definer para que el cliente (rol anon/authenticated) pueda
--    invocarla sin necesitar una policy de select sobre cupon_usos
--    (que expondría nombres/montos de afiliados a cualquiera).
-- ----------------------------------------------------------------------------
create or replace function public.fn_cupon_es_valido(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupon record;
  v_usos_actuales integer;
begin
  select id, activo, fecha_vencimiento, limite_usos
    into v_cupon
    from public.cupones
    where codigo = upper(trim(p_codigo));

  if not found or not v_cupon.activo then
    return false;
  end if;

  if v_cupon.fecha_vencimiento is not null and v_cupon.fecha_vencimiento <= now() then
    return false;
  end if;

  if v_cupon.limite_usos is not null then
    select count(*) into v_usos_actuales
      from public.cupon_usos
      where cupon_id = v_cupon.id;
    if v_usos_actuales >= v_cupon.limite_usos then
      return false;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.fn_cupon_es_valido(text) to anon, authenticated;

commit;
