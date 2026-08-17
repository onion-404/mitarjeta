-- ============================================================================
-- Migración: `tarjetas.giro` — categoría de negocio/rubro, elegida por el
-- dueño en el paso previo al editor (ver src/app/crear/paso-inicial o
-- equivalente, y src/lib/giros.ts). Motivo: hoy no hay forma de clasificar
-- una Linkard real por rubro — necesario para poder mostrar ejemplos reales
-- (no mockups ficticios) en secciones como el showcase por nicho del home
-- (ver docs/producto.md).
--
-- Nullable a propósito: toda tarjeta creada ANTES de esta migración queda
-- sin giro (dato que solo el dueño puede saber, no hay backfill posible) —
-- no rompe nada existente, mismo criterio "aditivo" que el resto de las
-- migraciones de este proyecto.
--
-- Lista cerrada vía CHECK — DEBE coincidir 1:1 con GIROS en
-- src/lib/giros.ts. Agregar/quitar un giro requiere actualizar los DOS
-- lugares a mano (no hay una fuente de verdad compartida entre SQL y TS).
-- ============================================================================

begin;

alter table public.tarjetas
  add column if not exists giro text
    check (
      giro is null or giro in (
        'salud_bienestar',
        'belleza_estetica',
        'gastronomia',
        'comercio_retail',
        'legal_consultoria',
        'automotriz',
        'hogar_servicios',
        'educacion',
        'arte_diseno',
        'eventos',
        'inmobiliaria',
        'creadores_freelance',
        'otro'
      )
    );

comment on column public.tarjetas.giro is
  'Categoría de negocio/rubro elegida por el dueño (lista cerrada, ver src/lib/giros.ts). Null = tarjeta creada antes de esta migración o dueño no la definió todavía.';

commit;
