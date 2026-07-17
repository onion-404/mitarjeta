@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-07-17. Este documento es la fuente de verdad para que
> cualquier sesión nueva entienda el estado real del proyecto sin releer el historial
> de chat. Actualizarlo cuando cambie algo de lo que describe.

## Modelo de negocio
- Plataforma tipo link-in-bio + agenda de servicios + venta de productos.
- El plan vive en la TARJETA, no en el usuario. Un usuario puede tener múltiples
  tarjetas, cada una con su propio plan y suscripción independiente.
- 3 planes: "presencia", "alcance", "poder" (slugs en DB, sin acentos). Ya sembrados
  en la tabla `planes` con precios placeholder — pendiente ajustar precios reales.
- Descuento configurable para tarjetas adicionales del mismo usuario (columna
  `configuracion.descuento_tarjeta_adicional_pct`), aplicado vía función
  `posicion_tarjeta_para_usuario()`.

## Pagos — IMPORTANTE, dos flujos separados que coexisten
- Checkout Pro (preferencias, ya integrado en `lib/mercadopago.ts`): pagos ÚNICOS. Se
  usa para venta de productos y para el pago opcional de una cita.
- Suscripciones (preapproval): EXCLUSIVO para el cobro recurrente mensual/anual del
  plan de la tarjeta. Aún NO implementado, pendiente.
- Nunca confundir ni mezclar ambos flujos.

## Agenda de servicios
- Pago OPCIONAL por servicio, default = contra entrega (`requiere_pago_inmediato: false`).
- Duración variable por servicio, definida por el dueño.
- Disponibilidad híbrida: horario semanal recurrente (`disponibilidad_semanal`) +
  excepciones puntuales (`disponibilidad_excepciones`).
- Comisión modelo tipo Didi/Rappi: corte periódico MANUAL vía tabla `liquidaciones`,
  admin marca como pagado tras transferir manualmente. Sin automatización de
  transferencias aún.

## Diferido a fase posterior (NO construir todavía salvo instrucción explícita)
- Integración con Google Calendar (OAuth + sync) — candidato a feature de plan "poder".
- Billetera nativa con ledger de comisión acumulada y solicitud de retiro de fondos.
- Migración del modelo de pago único actual de `tarjetas` a algo distinto (coexisten).
- CRUD de testimonios en admin dashboard (tabla `testimonios` ya diseñada, seed con 2
  placeholders, pendiente de construir la UI).
- Refactor del home público (secciones inspiradas en landing de Linktree, testimonios
  reales ya confirmados por el cliente aunque aún no compartidos).
- Dashboard de usuario con métricas (tablas `metricas_diarias`/`eventos_metricas` ya
  existen).

## Estado de la base de datos (aplicado en producción, sin ambiente de staging)
- Migración `20260716120000_add_planes_suscripciones_metricas.sql`: APLICADA. Tablas:
  `planes` (con seed), `tarjetas.plan_id`, `suscripciones`,
  `configuracion.descuento_tarjeta_adicional_pct`, `eventos_metricas`,
  `metricas_diarias` + trigger de rollup.
- Schema de agenda (`servicios_agendables`, `disponibilidad_semanal`,
  `disponibilidad_excepciones`, `citas`, `liquidaciones`): NO diseñado todavía,
  pendiente por completo.

## Pendiente técnico sin resolver
- `eventos_metricas` y `suscripciones` no permiten insert desde authenticated/anon a
  propósito (por diseño, evita manipulación de métricas/pagos). Falta crear el
  endpoint server-side con `service_role_key` que inserte eventos y gestione el
  ciclo de vida de suscripciones/citas con pago.
- `reclamo.ts` y `admin/dashboard/page.tsx` escriben directo a `tarjetas` desde rol
  `authenticated` — deuda técnica identificada, no resuelta (impide aplicar
  GRANT/REVOKE más estricto sobre esa tabla).
- `existe_solapamiento_cita()` valida disponibilidad pero NO previene condición de
  carrera entre dos inserts simultáneos del mismo horario (doble booking posible si
  dos personas agendan la misma franja al mismo instante). Hardening futuro: EXCLUDE
  constraint con extensión btree_gist. Aceptado como riesgo bajo para el volumen
  inicial, revisar si el doble booking se vuelve un problema real.

## Notas de proceso
- Proyecto de Supabase: producción única, sin staging. Antes de cualquier migración:
  backup con `pg_dump` (plan free, sin backups automáticos ni PITR).
- Convención de migraciones: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`,
  aditivas, envueltas en `BEGIN`/`COMMIT`.
</content>
