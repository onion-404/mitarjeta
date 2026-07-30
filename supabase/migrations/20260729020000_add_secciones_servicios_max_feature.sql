-- ============================================================================
-- Migración: agrega la clave `secciones_servicios_max` a `planes.features`.
--
-- 100% DE DATOS, no de schema — `planes.features` ya es jsonb (sin nueva
-- columna), mismo patrón idempotente que
-- 20260727030000_add_personalizacion_avanzada_feature.sql.
--
-- Necesaria para el reemplazo del toggle único "Servicios" del editor por N
-- secciones tipo catálogo (mismos campos que un Producto: título, precio,
-- descripción, imagen, enlace) — tope de secciones simultáneas según plan:
-- presencia 1, alcance 2, poder 3. Leído en tarjeta-form.tsx igual que
-- `servicios_agendables_max` ya se lee en agenda-servicios.tsx: sin CHECK
-- constraint rígido en DB (los límites por plan cambian con el tiempo).
--
-- Idempotente: puede correrse más de una vez sin efecto secundario, el
-- merge `||` simplemente vuelve a fijar el mismo valor.
-- ============================================================================

begin;

update public.planes
set features = features || jsonb_build_object(
  'secciones_servicios_max',
  case slug
    when 'presencia' then 1
    when 'alcance' then 2
    when 'poder' then 3
  end
)
where slug in ('presencia', 'alcance', 'poder');

commit;

-- Verificación sugerida después de aplicar (no forma parte de la migración):
-- select slug, features->'secciones_servicios_max' as secciones_servicios_max
-- from public.planes
-- order by orden;
-- Esperado: presencia -> 1, alcance -> 2, poder -> 3.
