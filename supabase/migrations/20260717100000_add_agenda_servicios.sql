-- ============================================================================
-- Migración: agenda de servicios (servicios agendables, disponibilidad
-- semanal + excepciones, citas, liquidaciones de comisión).
--
-- 100% ADITIVA: solo CREATE TABLE nuevas, sin ALTER sobre tablas existentes.
--
-- Modelo de pago de una cita (NO confundir con `suscripciones`, que es un
-- flujo aparte exclusivo del cobro recurrente del plan de la tarjeta):
--   - Cada servicio decide, vía `requiere_pago_inmediato`, si su cobro es
--     inmediato por Checkout Pro (pagos únicos, `lib/mercadopago.ts`, sin
--     tocar) o "contra entrega" (se gestiona fuera de la plataforma).
--   - Si `requiere_pago_inmediato = false` (default), la cita pasa directo
--     de 'pendiente_confirmacion' a 'confirmada', sin pasar nunca por los
--     estados de pago ni generar comisión ni liquidación: el dinero nunca
--     circula por la plataforma para esas citas.
--   - Solo las citas que sí cobraron por Checkout Pro alimentan
--     comision_mercadopago/comision_plataforma y entran a una liquidación.
--
-- Todas las escrituras de citas (crear, confirmar, marcar pagada) se hacen
-- server-side con service role desde un futuro endpoint (mismo patrón que
-- confirmar-pago.ts), que valida disponibilidad y solapamiento antes de
-- insertar. No hay policy de insert/update para anon/authenticated en
-- `citas` a propósito.
--
-- DISEÑO ÚNICAMENTE. No aplicar todavía contra la base de datos de
-- producción (sin ambiente de staging separado) hasta confirmación
-- explícita; no modifica `lib/mercadopago.ts`.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) servicios_agendables
-- ----------------------------------------------------------------------------
create table if not exists public.servicios_agendables (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  duracion_minutos integer not null check (duracion_minutos > 0),
  precio numeric not null check (precio >= 0),
  -- Default = contra entrega. El dueño decide por servicio si cobra por
  -- adelantado con Checkout Pro al momento de agendar.
  requiere_pago_inmediato boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists servicios_agendables_tarjeta_id_idx
  on public.servicios_agendables (tarjeta_id);

-- Nota: el límite de servicios por plan (planes.features->>'servicios_agendables_max')
-- NO se fuerza acá con un check rígido a propósito: los límites por plan
-- cambian con el tiempo (ajuste de precios/features) y una constraint de DB
-- quedaría desincronizada del jsonb en `planes`. Se valida en la aplicación
-- (el endpoint que crea el servicio cuenta los existentes contra el límite
-- del plan vigente de la tarjeta antes de insertar).

alter table public.servicios_agendables enable row level security;

create policy "servicios_agendables_select_publica"
  on public.servicios_agendables for select
  using (
    activo = true
    and exists (
      select 1 from public.tarjetas t
      where t.id = tarjeta_id and t.publicado = true
    )
  );

create policy "servicios_agendables_owner_todo"
  on public.servicios_agendables for all
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "servicios_agendables_admin_todo"
  on public.servicios_agendables for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 2) disponibilidad_semanal — horario recurrente base.
-- ----------------------------------------------------------------------------
create table if not exists public.disponibilidad_semanal (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null check (hora_fin > hora_inicio),
  created_at timestamptz not null default now()
);

create index if not exists disponibilidad_semanal_tarjeta_dia_idx
  on public.disponibilidad_semanal (tarjeta_id, dia_semana);

alter table public.disponibilidad_semanal enable row level security;

create policy "disponibilidad_semanal_select_publica"
  on public.disponibilidad_semanal for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.publicado = true
  ));

create policy "disponibilidad_semanal_owner_todo"
  on public.disponibilidad_semanal for all
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "disponibilidad_semanal_admin_todo"
  on public.disponibilidad_semanal for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 3) disponibilidad_excepciones — bloqueos o aperturas puntuales que
--    sobreescriben el horario base para una fecha específica.
-- ----------------------------------------------------------------------------
create table if not exists public.disponibilidad_excepciones (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('bloqueo', 'apertura_extra')),
  -- Nulos = bloqueo de día completo. Una 'apertura_extra' siempre necesita
  -- un rango (no tiene sentido "abrir todo el día" fuera del horario base).
  hora_inicio time,
  hora_fin time,
  check (hora_fin is null or hora_inicio is null or hora_fin > hora_inicio),
  check (tipo <> 'apertura_extra' or (hora_inicio is not null and hora_fin is not null)),
  created_at timestamptz not null default now()
);

create index if not exists disponibilidad_excepciones_tarjeta_fecha_idx
  on public.disponibilidad_excepciones (tarjeta_id, fecha);

alter table public.disponibilidad_excepciones enable row level security;

create policy "disponibilidad_excepciones_select_publica"
  on public.disponibilidad_excepciones for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.publicado = true
  ));

create policy "disponibilidad_excepciones_owner_todo"
  on public.disponibilidad_excepciones for all
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "disponibilidad_excepciones_admin_todo"
  on public.disponibilidad_excepciones for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 4) liquidaciones — corte periódico manual de comisión (modelo Didi/Rappi).
--    Se crea ANTES de `citas` porque esta última la referencia por FK.
--    Solo agrupa citas que sí tuvieron pago por Checkout Pro: las de
--    contra entrega nunca movieron dinero dentro de la plataforma, así que
--    no generan liquidación.
-- ----------------------------------------------------------------------------
create table if not exists public.liquidaciones (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fin date not null check (periodo_fin >= periodo_inicio),
  monto_bruto_total numeric not null default 0,
  comision_total numeric not null default 0,
  monto_a_pagar numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  fecha_pago_registrada timestamptz,
  -- Texto libre: el admin anota cómo transfirió (no hay automatización de
  -- pagos todavía, la transferencia real pasa fuera de la plataforma).
  referencia_pago text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists liquidaciones_tarjeta_id_idx on public.liquidaciones (tarjeta_id);
create index if not exists liquidaciones_estado_idx on public.liquidaciones (estado);

alter table public.liquidaciones enable row level security;

-- El dueño solo puede ver sus liquidaciones (transparencia de cuánto se le
-- retuvo/debe), no crearlas ni marcarlas como pagadas: eso es exclusivo del
-- admin, que es quien efectivamente hace el corte y transfiere.
create policy "liquidaciones_select_propia"
  on public.liquidaciones for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "liquidaciones_admin_todo"
  on public.liquidaciones for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- ----------------------------------------------------------------------------
-- 5) citas
-- ----------------------------------------------------------------------------
create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  servicio_id uuid not null references public.servicios_agendables(id),
  -- Cliente final sin cuenta de usuario: solo un dato de contacto de texto
  -- libre (teléfono o email), no hay FK a auth.users.
  cliente_nombre text not null,
  cliente_contacto text not null,
  fecha_hora_inicio timestamptz not null,
  -- Calculado por el endpoint a partir de servicios_agendables.duracion_minutos
  -- al momento de agendar (no es columna generada: Postgres no permite que
  -- una generated column lea otra tabla, y conviene fijar la duración
  -- efectivamente reservada aunque el servicio cambie de duración después).
  fecha_hora_fin timestamptz not null,
  check (fecha_hora_fin > fecha_hora_inicio),
  estado text not null default 'pendiente_confirmacion' check (estado in (
    'pendiente_confirmacion', 'confirmada', 'pendiente_pago', 'pagada',
    'cancelada', 'completada', 'no_asistio'
  )),
  -- Nota de flujo: si el servicio tiene requiere_pago_inmediato = false,
  -- la cita va directo de 'pendiente_confirmacion' a 'confirmada' y nunca
  -- pasa por 'pendiente_pago'/'pagada'.
  monto_bruto numeric not null default 0 check (monto_bruto >= 0),
  -- Los tres siguientes quedan null cuando la cita no tuvo pago por la
  -- plataforma (contra entrega): no aplica comisión de Mercado Pago ni de
  -- plataforma, y no hay neto que liquidar.
  comision_mercadopago numeric,
  -- Calculada por el endpoint desde planes.features->>'comision_venta_pct'
  -- del plan VIGENTE de la tarjeta al momento del pago (no un valor
  -- derivado en vivo): si el plan o su comisión cambian después, las citas
  -- ya cobradas conservan la tasa que se les aplicó en su momento.
  comision_plataforma numeric,
  monto_neto_proveedor numeric,
  -- Preference de Checkout Pro (pagos únicos); solo se genera cuando el
  -- servicio exige pago inmediato. No tiene relación con `suscripciones`.
  preference_id text,
  liquidacion_id uuid references public.liquidaciones(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists citas_tarjeta_fecha_idx
  on public.citas (tarjeta_id, fecha_hora_inicio);
create index if not exists citas_estado_idx on public.citas (estado);
create index if not exists citas_liquidacion_id_idx
  on public.citas (liquidacion_id) where liquidacion_id is not null;

alter table public.citas enable row level security;

create policy "citas_select_propia"
  on public.citas for select
  using (exists (
    select 1 from public.tarjetas t
    where t.id = tarjeta_id and t.user_id = auth.uid()
  ));

create policy "citas_admin_todo"
  on public.citas for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- Sin policy de insert/update para authenticated/anon a propósito: crear
-- una cita implica validar disponibilidad/solapamiento y, si corresponde,
-- generar la preferencia de Checkout Pro, así que el ciclo de vida completo
-- lo maneja un futuro endpoint server-side con el cliente de service role
-- (mismo patrón que confirmar-pago.ts). El cliente final tampoco tiene
-- cuenta para autenticarse contra una policy de todos modos.

-- ----------------------------------------------------------------------------
-- 6) Validación de solapamiento — para no permitir doble booking.
--    Una cita ocupa la franja si está 'confirmada' o 'pagada', sin importar
--    si esa cita en particular llevaba pago o no (una reserva confirmada a
--    contra entrega bloquea el horario igual que una pagada).
--    Pensada para uso del endpoint ANTES de insertar una cita nueva; no se
--    aplica como constraint automática (ver nota de concurrencia abajo).
-- ----------------------------------------------------------------------------
create or replace function public.existe_solapamiento_cita(
  p_tarjeta_id uuid,
  p_fecha_hora_inicio timestamptz,
  p_fecha_hora_fin timestamptz,
  p_excluir_cita_id uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.citas c
    where c.tarjeta_id = p_tarjeta_id
      and c.estado in ('confirmada', 'pagada')
      and (p_excluir_cita_id is null or c.id <> p_excluir_cita_id)
      and c.fecha_hora_inicio < p_fecha_hora_fin
      and c.fecha_hora_fin > p_fecha_hora_inicio
  );
$$;

-- Nota de concurrencia: esta función por sí sola no evita una condición de
-- carrera entre dos inserts simultáneos (ambos podrían leer "libre" antes
-- de que el otro confirme). Alcanza para el volumen esperado inicialmente;
-- si el doble booking llega a ser un problema real, la forma robusta es un
-- EXCLUDE constraint con btree_gist sobre (tarjeta_id, tsrange(...)) que
-- rechace el insert a nivel de DB. No se agrega ahora para no meter una
-- extensión nueva sin necesidad comprobada.

commit;
