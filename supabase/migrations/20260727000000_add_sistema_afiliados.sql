-- ============================================================================
-- Migración: sistema de afiliados con comisión recurrente + pagos manuales.
--
-- 100% ADITIVA. Ver CLAUDE.md para el diseño completo discutido y aprobado
-- antes de esta migración (incluye la decisión de negocio: la comisión se
-- calcula sobre CADA cobro/renovación, no solo sobre la venta inicial).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) afiliados: registro manual (sin autoregistro). Matching con el login de
--    Google por email en tiempo de consulta vía auth.jwt()->>'email' (mismo
--    patrón ya usado en todo el proyecto para ADMIN_EMAIL) — sin FK a
--    auth.users a propósito: el admin puede dar de alta un afiliado por su
--    email antes de que esa persona haya iniciado sesión alguna vez.
-- ----------------------------------------------------------------------------
create table if not exists public.afiliados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  porcentaje_comision numeric(5, 2) not null check (porcentaje_comision > 0 and porcentaje_comision <= 100),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists afiliados_email_unique_idx on public.afiliados (lower(email));

comment on table public.afiliados is
  'Afiliados/partners con comisión recurrente sobre las ventas atribuidas a sus cupones. Alta 100% manual por el admin.';
comment on column public.afiliados.email is
  'Matchea contra auth.jwt()->>''email'' (login de Google, mismo email que ya usan los dueños de tarjeta) para habilitar la pestaña "Ganancias" en Mi Cuenta.';

alter table public.afiliados enable row level security;

create policy "afiliados_admin_todo"
  on public.afiliados for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

-- Solo lectura de SU PROPIA fila — el afiliado no puede editar nada.
create policy "afiliados_select_propio"
  on public.afiliados for select
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ----------------------------------------------------------------------------
-- 2) cupones: vínculo formal a afiliados. afiliado_nombre (texto libre) se
--    mantiene como estaba — sigue siendo el snapshot de respaldo para
--    cupon_usos históricos sin afiliado_id.
-- ----------------------------------------------------------------------------
alter table public.cupones
  add column if not exists afiliado_id uuid references public.afiliados(id) on delete set null;

comment on column public.cupones.afiliado_id is
  'FK formal al afiliado dueño de este código. Un afiliado puede tener múltiples cupones a la vez o a lo largo del tiempo.';

-- ----------------------------------------------------------------------------
-- 3) cupon_usos: columnas de fee real de Stripe + afiliado_id (nullable +
--    on delete set null, mismo patrón que cupon_id/tarjeta_id/suscripcion_id
--    — el historial de comisiones de un afiliado debe sobrevivir aunque se
--    borre el afiliado). stripe_invoice_id es la clave de idempotencia para
--    inserts por CADA cobro/renovación — único cuando no es null; las filas
--    ya existentes (insertadas antes de este cambio, una por suscripción en
--    vez de una por cobro) quedan con stripe_invoice_id null, permitido.
-- ----------------------------------------------------------------------------
alter table public.cupon_usos
  add column if not exists afiliado_id uuid references public.afiliados(id) on delete set null,
  add column if not exists stripe_invoice_id text,
  add column if not exists comision_stripe numeric,
  add column if not exists monto_neto numeric;

create unique index if not exists cupon_usos_stripe_invoice_id_unique_idx
  on public.cupon_usos (stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists cupon_usos_afiliado_id_idx on public.cupon_usos (afiliado_id);

comment on column public.cupon_usos.stripe_invoice_id is
  'ID del Invoice de Stripe que generó esta fila — una fila por cada cobro/renovación (no una por suscripción). Único cuando no es null: es la clave de idempotencia ante reintentos de webhook.';
comment on column public.cupon_usos.comision_stripe is
  'Fee real cobrado por Stripe para ESTE cobro puntual (balance_transaction.fee / 100). Null hasta que se confirme (puede haber lag async, ver charge.updated).';
comment on column public.cupon_usos.monto_neto is
  'precio_final - comision_stripe. Base real sobre la que se calcula la comisión del afiliado (nunca sobre el bruto). Null mientras comision_stripe sea null.';

-- Lectura de solo lectura para el afiliado sobre SUS propios usos (la
-- policy cupon_usos_admin_todo ya existente sigue intacta, se OR-ean).
create policy "cupon_usos_afiliado_select_propio"
  on public.cupon_usos for select
  using (
    afiliado_id in (
      select id from public.afiliados
      where lower(email) = lower(auth.jwt() ->> 'email') and activo = true
    )
  );

-- ----------------------------------------------------------------------------
-- 4) afiliado_pagos: registro manual de cada pago realizado a un afiliado.
--    Mismo patrón de auditoría que cupon_usos: afiliado_id nullable + on
--    delete set null, con snapshot de nombre — el historial de pagos ya
--    hechos no debe desaparecer si el afiliado se borra algún día.
-- ----------------------------------------------------------------------------
create table if not exists public.afiliado_pagos (
  id uuid primary key default gen_random_uuid(),
  afiliado_id uuid references public.afiliados(id) on delete set null,
  afiliado_nombre text not null,
  monto numeric not null check (monto > 0),
  fecha date not null,
  nota text,
  registrado_por text not null default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);

create index if not exists afiliado_pagos_afiliado_id_idx on public.afiliado_pagos (afiliado_id);

alter table public.afiliado_pagos enable row level security;

create policy "afiliado_pagos_admin_todo"
  on public.afiliado_pagos for all
  using (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com')
  with check (auth.jwt() ->> 'email' = 'emuna.interno@gmail.com');

create policy "afiliado_pagos_afiliado_select_propio"
  on public.afiliado_pagos for select
  using (
    afiliado_id in (
      select id from public.afiliados
      where lower(email) = lower(auth.jwt() ->> 'email') and activo = true
    )
  );

commit;
