-- ============================================================================
-- Fix real encontrado en la verificación en vivo del sistema de afiliados: el
-- índice único parcial `cupon_usos_stripe_invoice_id_unique_idx` (where
-- stripe_invoice_id is not null) no puede usarse como target de ON CONFLICT
-- desde supabase-js (`.upsert(..., {onConflict: "stripe_invoice_id"})`) —
-- Postgres exige que el ON CONFLICT incluya el mismo predicado WHERE que el
-- índice parcial, algo que el cliente no puede expresar. Error real
-- confirmado en logs: "there is no unique or exclusion constraint matching
-- the ON CONFLICT specification" (42P10).
--
-- La solución es más simple que el diseño original: un unique constraint
-- normal en Postgres YA trata cada NULL como distinto de cualquier otro NULL
-- (nunca chocan entre sí) — no hacía falta el índice parcial para permitir
-- múltiples filas legacy con stripe_invoice_id null, un constraint sin
-- condición WHERE ya lo permite igual, y SÍ funciona como target de
-- ON CONFLICT.
-- ============================================================================

begin;

drop index if exists public.cupon_usos_stripe_invoice_id_unique_idx;

alter table public.cupon_usos
  add constraint cupon_usos_stripe_invoice_id_key unique (stripe_invoice_id);

commit;
