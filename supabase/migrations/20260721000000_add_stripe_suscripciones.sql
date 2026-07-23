-- ============================================================================
-- Suscripciones con Stripe (Checkout + Billing) como segundo proveedor,
-- en paralelo a Mercado Pago (preapproval) — Mercado Pago Checkout Pro
-- (citas, cobro manual) no se toca. Aditiva, no borra ni renombra nada del
-- modelo actual: las columnas de Mercado Pago (preapproval_id,
-- preapproval_plan_id) quedan intactas, solo se usan cuando
-- proveedor = 'mercadopago'.
-- ============================================================================

BEGIN;

alter table public.suscripciones
  add column if not exists proveedor text not null default 'mercadopago'
    check (proveedor in ('mercadopago', 'stripe'));

alter table public.suscripciones
  add column if not exists stripe_customer_id text;

alter table public.suscripciones
  add column if not exists stripe_subscription_id text unique;

alter table public.suscripciones
  add column if not exists stripe_checkout_session_id text;

COMMIT;
