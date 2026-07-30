begin;

-- Permite 'manual' como proveedor válido en suscripciones (alta manual
-- desde el admin, ej. pago por transferencia que el cliente gestiona
-- personalmente, sin pasar por Stripe). El nombre real del constraint se
-- busca por introspección en vez de asumirlo a ciegas (fue agregado
-- inline vía "add column ... check (...)" en
-- 20260721000000_add_stripe_suscripciones.sql, Postgres le puso un nombre
-- automático que no se pudo confirmar desde este entorno sin CLI de
-- supabase vinculado).
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'suscripciones'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%proveedor%';

  if v_constraint_name is not null then
    execute format('alter table public.suscripciones drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.suscripciones
  add constraint suscripciones_proveedor_check
  check (proveedor in ('mercadopago', 'stripe', 'manual'));

-- Trazabilidad del alta manual — nullable, solo se completan para
-- proveedor='manual' (las filas de Stripe/Mercado Pago quedan como están).
alter table public.suscripciones
  add column if not exists registrado_por text,
  add column if not exists nota_manual text;

commit;
