# Base de datos: estado de migraciones (producción, sin staging)

> Detalle de DB — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

Todas las migraciones siguientes están **APLICADAS** en producción (confirmadas por consulta
real desde esta sesión salvo que se indique lo contrario):
- `20260716120000_add_planes_suscripciones_metricas.sql` — `planes` (seed), `tarjetas.plan_id`,
  `suscripciones`, `configuracion.descuento_tarjeta_adicional_pct`, `eventos_metricas`,
  `metricas_diarias` + trigger de rollup.
- `20260717100000_add_agenda_servicios.sql` — `servicios_agendables`,
  `disponibilidad_semanal`, `disponibilidad_excepciones`, `citas`, `liquidaciones`.
- `20260717180000_add_plan_default_y_zona_horaria.sql` — default de `plan_id` (después
  revertido) + `tarjetas.zona_horaria`.
- `20260717210000_add_suscripciones_cupon_codigo.sql` — `suscripciones.cupon_codigo`.
- `20260717230000_drop_default_plan_id_tarjetas.sql` — quita el DEFAULT de `plan_id`.
- `20260721000000_add_stripe_suscripciones.sql` — `suscripciones.proveedor`,
  `stripe_customer_id`, `stripe_subscription_id`, `stripe_checkout_session_id`.
- `20260725000000_endurecer_rls_servicios_agendables_plan.sql` — exige `plan_id IS NOT NULL`
  en las 3 policies públicas de agenda (confirmado por el usuario, no verificado desde esta
  sesión — sin `supabase` CLI vinculado).
- `20260725010000_add_suscripciones_historial.sql` — tabla `suscripciones_historial` +
  trigger AFTER UPDATE en `suscripciones` + backfill de un punto de anclaje. **Limitación
  aceptada**: el churn que muestra el dashboard admin solo es preciso desde 2026-07-25 en
  adelante (no retroactivo — el backfill es un ancla, no una reconstrucción del pasado).
  Confirmado por el usuario, no verificado desde esta sesión.
- `20260725020000_add_eventos_metricas_visitante_hash.sql` — `eventos_metricas.visitante_hash`
  + índice `(tarjeta_id, visitante_hash)`. Confirmado por el usuario.
- `20260726000000_add_cupones_avanzado.sql` — `cupones.afiliado_nombre/fecha_vencimiento/
  limite_usos`, tabla `cupon_usos`, función `fn_cupon_es_valido()`.
- `20260727000000_add_sistema_afiliados.sql` — tablas `afiliados`, `afiliado_pagos`,
  `cupones.afiliado_id`, `cupon_usos.afiliado_id/stripe_invoice_id/comision_stripe/
  monto_neto`.
- `20260727010000_fix_cupon_usos_stripe_invoice_id_unique.sql` — fix de constraint único (ver
  nota técnica en docs/afiliados.md).
- `20260727020000_add_secciones_servicios_max_feature.sql` — `planes.features.
  secciones_servicios_max` (presencia=1, alcance=2, poder=3).
- `20260727030000_add_personalizacion_avanzada_feature.sql` — `planes.features.
  personalizacion_avanzada`.
- `20260729000000_add_fn_cupon_usos_restantes.sql` — función `fn_cupon_usos_restantes()`.
- `20260729010000_add_suscripciones_manual.sql` — agrega `'manual'` al constraint de
  `suscripciones.proveedor` + columnas `registrado_por`/`nota_manual`.
- 🔴 **`20260801000000_add_tarjeta_slug_historial.sql` — SIN APLICAR en producción** (ver
  docs/editor.md, "Editor unificado"). El límite de 2 cambios/14 días de slug NO está enforced
  todavía a nivel de DB — el chequeo del cliente es puramente decorativo hasta que se corra.
  Pendiente de que el usuario la corra manualmente (backup primero).
- `20260810000000_add_agenda_intervalo_colchon.sql` — `tarjetas.intervalo_agenda_minutos`,
  `servicios_agendables.colchon_minutos`, `existe_solapamiento_cita()` actualizada con
  `p_colchon_minutos`. Confirmada aplicada por consulta real desde esta sesión (columnas +
  RPC responden sin error).
- `20260811000000_planes_connect_growth.sql` — 3 planes → 2 (`connect`/`growth`, ver
  docs/negocio.md). **APLICADA en producción**, corrida por el usuario y confirmada por
  consulta real desde esta sesión (`planes` devuelve exactamente esas 2 filas con las
  features esperadas).
- `20260817000000_add_tarjeta_giro.sql` — `tarjetas.giro` (text, nullable, CHECK con 13
  valores cerrados — ver `src/lib/giros.ts` para la lista, DEBE mantenerse sincronizada a
  mano). **APLICADA en producción**, corrida por el usuario y confirmada por consulta real
  desde esta sesión (columna responde sin error). Backfill + placeholder de showcase hechos
  después — ver docs/producto.md.
