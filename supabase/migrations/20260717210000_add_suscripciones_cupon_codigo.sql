-- ============================================================================
-- Migración: trazabilidad de cupón aplicado en una suscripción.
--
-- 100% ADITIVA: 1 ALTER TABLE ADD COLUMN nullable, sin default forzado, sin
-- afectar filas existentes.
--
-- Mismo patrón que `tarjetas.cupon_codigo` (flujo viejo de pago único): guarda
-- el código de cupón usado al crear una suscripción, si aplicó alguno. Texto
-- libre (no FK a `cupones`) porque un cupón puede desactivarse o borrarse
-- después sin que eso deba alterar el historial de qué se usó en su momento.
--
-- Generada: 2026-07-17. Producción, sin ambiente de staging separado.
-- ============================================================================

begin;

alter table public.suscripciones
  add column if not exists cupon_codigo text;

commit;
