-- ============================================================================
-- Migración: planes de suscripción, suscripciones (Mercado Pago Suscripciones),
-- métricas por evento y su rollup diario.
--
-- 100% ADITIVA: solo CREATE TABLE nuevas + 2 ALTER TABLE ADD COLUMN
-- (tarjetas.plan_id, configuracion.descuento_tarjeta_adicional_pct), ambas
-- nullable/con default constante, sin backfill de datos existentes.
--
-- NO incluye la restricción de GRANT/REVOKE sobre columnas de `tarjetas`
-- propuesta en la ronda de diseño anterior: rompería `reclamo.ts` (escribe
-- `user_id`) y `admin/dashboard/page.tsx` (escribe `estado_pago`), ambos
-- desde el rol `authenticated`. Queda pendiente como cambio aparte, en
-- conjunto con mover esas escrituras a un endpoint server-side.
--
-- Generada: 2026-07-16. Producción, sin ambiente de staging separado.
-- Verificar backup reciente (pg_dump o Backups del dashboard) antes de aplicar.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) planes
-- ----------------------------------------------------------------------------
create table if not exists public.planes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug in ('presencia', 'alcance', 'poder')),
  nombre_display text not null,
  precio_mensual numeric not null check (precio_mensual >= 0),
  precio_anual numeric not null check (precio_anual >= 0),
  orden smallint not null,
  activo boolean not null default true,
  -- Matriz de features/límites por plan (evita "if plan === 'alcance'" en el código).
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.planes enable row level security;

create policy "planes_select_publica"
  on public.planes for select
  using (true);

create policy "planes_admin_todo"
  on public.planes for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- Precios placeholder: ajustar antes de que esto sea real para clientes.
insert into public.planes (slug, nombre_display, precio_mensual, precio_anual, orden, features) values
  ('presencia', 'Presencia', 149, 1490, 1, '{
    "temas_preestablecidos": true,
    "personalizacion_libre": false,
    "metricas_desglose": false,
    "metricas_exportacion": false,
    "metricas_rango_custom": false,
    "servicios_agendables_max": 1,
    "marca_plataforma_oculta": false,
    "comision_venta_pct": 8,
    "recordatorios_automaticos": false
  }'::jsonb),
  ('alcance', 'Alcance', 299, 2990, 2, '{
    "temas_preestablecidos": true,
    "personalizacion_libre": true,
    "metricas_desglose": true,
    "metricas_exportacion": false,
    "metricas_rango_custom": false,
    "servicios_agendables_max": 999,
    "marca_plataforma_oculta": false,
    "comision_venta_pct": 4,
    "recordatorios_automaticos": false
  }'::jsonb),
  ('poder', 'Poder', 599, 5990, 3, '{
    "temas_preestablecidos": true,
    "personalizacion_libre": true,
    "metricas_desglose": true,
    "metricas_exportacion": true,
    "metricas_rango_custom": true,
    "servicios_agendables_max": 999,
    "marca_plataforma_oculta": true,
    "comision_venta_pct": 0,
    "recordatorios_automaticos": true
  }'::jsonb)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 2) tarjetas.plan_id — plan vigente (caché denormalizado; la fuente de
--    verdad es `suscripciones`, se actualiza junto con ella desde el webhook).
-- ----------------------------------------------------------------------------
alter table public.tarjetas
  add column if not exists plan_id uuid references public.planes(id);

-- ----------------------------------------------------------------------------
-- 3) suscripciones
-- ----------------------------------------------------------------------------
create table if not exists public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  plan_id uuid not null references public.planes(id),
  preapproval_id text unique,
  preapproval_plan_id text,
  periodicidad text not null check (periodicidad in ('mensual', 'anual')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'autorizada', 'pausada', 'cancelada', 'vencida')),
  es_adicional boolean not null default false,
  descuento_aplicado numeric not null default 0 check (descuento_aplicado between 0 and 100),
  precio_base numeric not null,
  precio_final numeric not null,
  fecha_inicio timestamptz not null default now(),
  fecha_renovacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suscripciones_tarjeta_id_idx on public.suscripciones (tarjeta_id);
create index if not exists suscripciones_estado_idx on public.suscripciones (estado);

-- Solo una suscripción "viva" (no terminal) por tarjeta a la vez.
create unique index if not exists suscripciones_una_activa_por_tarjeta
  on public.suscripciones (tarjeta_id)
  where estado in ('pendiente', 'autorizada', 'pausada');

alter table public.suscripciones enable row level security;

create policy "suscripciones_select_propia"
  on public.suscripciones for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "suscripciones_admin_todo"
  on public.suscripciones for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- Sin policy de insert/update para authenticated/anon a propósito: el ciclo
-- de vida (crear preapproval, confirmar autorización, cancelar) lo maneja
-- el webhook con el cliente de service role, igual que confirmar-pago.ts
-- hoy con `tarjetas`.

-- ----------------------------------------------------------------------------
-- 4) configuracion.descuento_tarjeta_adicional_pct — % configurable desde
--    el dashboard admin para la 2da+ tarjeta del mismo usuario.
-- ----------------------------------------------------------------------------
alter table public.configuracion
  add column if not exists descuento_tarjeta_adicional_pct numeric not null default 0
    check (descuento_tarjeta_adicional_pct between 0 and 100);

-- ----------------------------------------------------------------------------
-- 5) Función: posición (1ra/2da/3ra+) de una tarjeta nueva para un usuario,
--    para decidir si aplica descuento_tarjeta_adicional_pct.
-- ----------------------------------------------------------------------------
create or replace function public.posicion_tarjeta_para_usuario(p_user_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer + 1
  from public.tarjetas
  where user_id = p_user_id;
$$;

-- ----------------------------------------------------------------------------
-- 6) eventos_metricas — log append-only de eventos de la tarjeta pública.
-- ----------------------------------------------------------------------------
create table if not exists public.eventos_metricas (
  id bigint generated always as identity primary key,
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  tipo_evento text not null check (tipo_evento in (
    'vista_tarjeta', 'click_enlace', 'click_agendar',
    'agenda_completada', 'click_producto', 'compra_completada'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists eventos_metricas_tarjeta_fecha_idx
  on public.eventos_metricas (tarjeta_id, created_at desc);
create index if not exists eventos_metricas_tarjeta_tipo_fecha_idx
  on public.eventos_metricas (tarjeta_id, tipo_evento, created_at desc);

alter table public.eventos_metricas enable row level security;

create policy "eventos_metricas_select_propia"
  on public.eventos_metricas for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "eventos_metricas_admin_todo"
  on public.eventos_metricas for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- Sin policy de insert para anon/authenticated: los eventos son fáciles de
-- falsear (inflar vistas, o peor, "compra_completada" alimenta la comisión
-- de venta), así que se insertan solo server-side vía un futuro endpoint
-- con rate-limit (mismo patrón que /api/checkout, /api/cloudinary-sign),
-- usando el cliente de service role.

-- ----------------------------------------------------------------------------
-- 7) metricas_diarias — rollup pre-agregado (tarjeta_id, fecha, tipo_evento).
--    Sirve el dashboard "básico" (plan presencia: totales) sin escanear
--    eventos_metricas. Los planes alcance/poder siguen consultando
--    eventos_metricas directo para desglose/rango custom.
-- ----------------------------------------------------------------------------
create table if not exists public.metricas_diarias (
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  fecha date not null,
  tipo_evento text not null,
  cantidad integer not null default 0,
  primary key (tarjeta_id, fecha, tipo_evento)
);

alter table public.metricas_diarias enable row level security;

create policy "metricas_diarias_select_propia"
  on public.metricas_diarias for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "metricas_diarias_admin_todo"
  on public.metricas_diarias for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- Trigger de rollup: cada insert en eventos_metricas incrementa el
-- contador del día correspondiente en metricas_diarias, en tiempo real
-- (sin depender de un cron nocturno para que el dashboard básico funcione hoy).
create or replace function public.fn_registrar_metrica_diaria()
returns trigger
language plpgsql
as $$
begin
  insert into public.metricas_diarias (tarjeta_id, fecha, tipo_evento, cantidad)
  values (new.tarjeta_id, (new.created_at at time zone 'utc')::date, new.tipo_evento, 1)
  on conflict (tarjeta_id, fecha, tipo_evento)
  do update set cantidad = public.metricas_diarias.cantidad + 1;
  return new;
end;
$$;

drop trigger if exists trg_eventos_metricas_rollup on public.eventos_metricas;
create trigger trg_eventos_metricas_rollup
  after insert on public.eventos_metricas
  for each row execute function public.fn_registrar_metrica_diaria();

commit;
