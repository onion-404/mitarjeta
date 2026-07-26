-- ============================================================================
-- Migración: agrega la clave `personalizacion_avanzada` a `planes.features`.
--
-- 100% DE DATOS, no de schema — `planes.features` ya es jsonb (sin nueva
-- columna). Necesaria para el sistema de personalización avanzada del
-- editor (formas de avatar exóticas, divisores no-rectos, glassmorfismo,
-- modo avanzado de color/tipografía): `personalizacion_libre` (ya existe)
-- sigue gateando personalización básica (Alcance+Poder); esta clave nueva
-- distingue Poder como el único plan con la capa avanzada.
--
-- Idempotente: puede correrse más de una vez sin efecto secundario, el
-- merge `||` simplemente vuelve a fijar el mismo valor.
-- ============================================================================

begin;

update public.planes
set features = features || jsonb_build_object('personalizacion_avanzada', (slug = 'poder'))
where slug in ('presencia', 'alcance', 'poder');

commit;

-- Verificación sugerida después de aplicar (no forma parte de la migración):
-- select slug, features->'personalizacion_avanzada' as personalizacion_avanzada
-- from public.planes
-- order by orden;
-- Esperado: presencia -> false, alcance -> false, poder -> true.
