-- ============================================================================
-- Migración: 3 planes (presencia/alcance/poder) → 2 planes ("Linkard Connect"
-- / "Linkard Growth"). Decisión de negocio (2026-08-11): personalización y
-- funciones del editor quedan IGUALES en ambos planes — la única diferencia
-- real entre los dos es que Growth incluye estadísticas (métricas) y Connect
-- no incluye ninguna.
--
-- Verificado contra producción antes de escribir esta migración (consulta
-- real, service role, sin CLI de supabase vinculado): 0 tarjetas y 0
-- suscripciones (activas o en `suscripciones_historial`) apuntan a
-- 'presencia' o 'alcance' — se pueden reciclar/borrar sin dejar ninguna fila
-- huérfana. Las 4 suscripciones reales existentes hoy (estado 'autorizada',
-- proveedor 'manual') están en 'poder' → quedan mapeadas a 'growth' sin
-- ningún cambio de fila en `tarjetas`/`suscripciones` (mismo `plan_id`, la
-- fila de `planes` solo cambia de slug/nombre/features).
--
-- Estrategia: UPDATE in-place de 'alcance'→'connect' y 'poder'→'growth'
-- (conserva el mismo `id`, cero impacto en FKs existentes) + DELETE de
-- 'presencia' (sin referencias). El CHECK constraint de `slug` se reemplaza
-- por el nuevo par válido.
--
-- Precios: se conservan los que ya estaban vigentes en Alcance/Poder (no fue
-- un pedido de este cambio ajustar precios) — editables después desde
-- /admin/configuracion.
--
-- Producción, sin ambiente de staging. Verificar backup reciente (pg_dump o
-- Backups del dashboard de Supabase) antes de aplicar.
-- ============================================================================

begin;

-- 1) Habilitar temporalmente los slugs nuevos para poder hacer el UPDATE.
alter table public.planes drop constraint if exists planes_slug_check;
alter table public.planes
  add constraint planes_slug_check
  check (slug in ('presencia', 'alcance', 'poder', 'connect', 'growth'));

-- 2) Alcance → Connect. Gana personalizacion_avanzada (antes exclusiva de
--    Poder) y secciones_servicios_max sube a 3 (el tope de Poder) — ambos
--    planes quedan con el mismo tope real de personalización/funciones.
--    Pierde metricas_desglose (ya no aplica: Connect no tiene estadísticas).
update public.planes
set
  slug = 'connect',
  nombre_display = 'Linkard Connect',
  orden = 1,
  features = '{
    "temas_preestablecidos": true,
    "personalizacion_libre": true,
    "personalizacion_avanzada": true,
    "secciones_servicios_max": 3,
    "servicios_agendables_max": 999,
    "metricas_activas": false,
    "metricas_desglose": false,
    "metricas_rango_custom": false,
    "metricas_exportacion": false,
    "marca_plataforma_oculta": true,
    "comision_venta_pct": 0,
    "recordatorios_automaticos": false
  }'::jsonb
where slug = 'alcance';

-- 3) Poder → Growth. Mismo tope de personalización/funciones que Connect
--    (sin cambios ahí) + todas las métricas activas (desglose, rango
--    personalizado, exportación CSV).
update public.planes
set
  slug = 'growth',
  nombre_display = 'Linkard Growth',
  orden = 2,
  features = '{
    "temas_preestablecidos": true,
    "personalizacion_libre": true,
    "personalizacion_avanzada": true,
    "secciones_servicios_max": 3,
    "servicios_agendables_max": 999,
    "metricas_activas": true,
    "metricas_desglose": true,
    "metricas_rango_custom": true,
    "metricas_exportacion": true,
    "marca_plataforma_oculta": true,
    "comision_venta_pct": 0,
    "recordatorios_automaticos": false
  }'::jsonb
where slug = 'poder';

-- 4) Presencia se elimina — sin tarjetas ni suscripciones que lo referencien
--    (confirmado arriba). Si en algún momento entre escribir y aplicar esta
--    migración alguna tarjeta nueva llegó a apuntarle, el DELETE falla por
--    la FK de `tarjetas.plan_id` en vez de dejar una referencia rota.
delete from public.planes where slug = 'presencia';

-- 5) Constraint final: solo los 2 slugs vigentes.
alter table public.planes drop constraint planes_slug_check;
alter table public.planes
  add constraint planes_slug_check
  check (slug in ('connect', 'growth'));

commit;
