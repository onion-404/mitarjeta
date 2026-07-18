-- ============================================================================
-- Migración: elimina el DEFAULT de tarjetas.plan_id.
--
-- Contexto: con los 3 planes de pago (ya no hay tier gratuito), que una
-- tarjeta nueva arrancara con plan_id apuntando a "presencia" le daba
-- gating de un plan pagado (servicios_agendables_max, comision_venta_pct)
-- sin que existiera ningún intento de pago — mismo hueco que se cierra del
-- otro lado del ciclo de vida al revertir plan_id a null cuando una
-- suscripción se pausa/cancela/vence (ver lib/confirmar-suscripcion.ts).
--
-- A partir de esta migración: una tarjeta se registra igual (aunque el pago
-- se abandone o falle), pero plan_id queda null hasta que exista una fila
-- en `suscripciones` con estado 'autorizada' para esa tarjeta — el webhook
-- de Suscripciones es quien lo asigna en ese momento.
--
-- 100% ADITIVA: 1 ALTER COLUMN DROP DEFAULT (metadata-only, no reescribe
-- filas ni afecta el plan_id que ya tengan las tarjetas existentes). La
-- función `plan_id_por_defecto()` NO se borra (queda sin uso como default de
-- columna, pero disponible si hiciera falta reutilizarla).
--
-- Generada: 2026-07-17. Producción, sin ambiente de staging separado.
-- ============================================================================

begin;

alter table public.tarjetas
  alter column plan_id drop default;

commit;
