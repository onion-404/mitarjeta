@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-07-17. Este documento es la fuente de verdad para que
> cualquier sesión nueva entienda el estado real del proyecto sin releer el historial
> de chat. Actualizarlo cuando cambie algo de lo que describe.

## Modelo de negocio
- Plataforma tipo link-in-bio + agenda de servicios + venta de productos.
- El plan vive en la TARJETA, no en el usuario. Un usuario puede tener múltiples
  tarjetas, cada una con su propio plan y suscripción independiente.
- 3 planes: "presencia", "alcance", "poder" (slugs en DB, sin acentos), **los 3 de
  pago — no existe tier gratuito**. Ya sembrados en la tabla `planes` con precios
  placeholder — pendiente ajustar precios reales.
- Descuento configurable para tarjetas adicionales del mismo usuario (columna
  `configuracion.descuento_tarjeta_adicional_pct`), aplicado vía función
  `posicion_tarjeta_para_usuario()`.
- **Ya NO hay DEFAULT de `plan_id` en tarjetas nuevas** (revertido: con los 3 planes
  pagos, arrancar en "presencia" gratis por defecto daba gating de un plan pagado sin
  ningún intento de pago). Una tarjeta se registra igual aunque el pago se abandone o
  falle, pero `plan_id` queda `null` hasta que exista una suscripción `'autorizada'`
  real. La función `plan_id_por_defecto()` sigue existiendo (sin uso como default de
  columna) por si hiciera falta reutilizarla. Migración:
  `20260717230000_drop_default_plan_id_tarjetas.sql`.

## Pagos — IMPORTANTE, dos flujos separados que coexisten
- Checkout Pro (preferencias, ya integrado en `lib/mercadopago.ts`): pagos ÚNICOS. Se
  usa para venta de productos y para el pago opcional de una cita.
- Suscripciones (preapproval, `lib/mercadopago-suscripciones.ts`): EXCLUSIVO para el
  cobro recurrente mensual/anual del plan de la tarjeta. Backend implementado
  (funciones + endpoint + webhook), ver sección propia abajo.
- Nunca confundir ni mezclar ambos flujos — son archivos, tablas y webhooks
  separados a propósito.

## Suscripciones (cobro recurrente del plan) — estado del backend
- Modalidad elegida: preapproval **"sin plan asociado"** (términos inline en cada
  suscripción), NO "con plan asociado". La razón: Mercado Pago exige que una
  suscripción "con plan asociado" se cree ya con `card_token_id` (tarjeta
  tokenizada vía Checkout Bricks en el frontend) y status `authorized` **sin
  ningún redirect posible**. "Sin plan asociado" permite mandar `auto_recurring`
  directo y redirigir a un `init_point`, igual que Checkout Pro — sin agregar
  Bricks ni scope de tarjeta al frontend. Consecuencia: **no se usa
  `preapproval_plan`** en absoluto; `suscripciones.preapproval_plan_id` (ya
  existía, nullable) queda sin usar. El precio final se calcula igual que
  Checkout Pro: inline, al momento de crear cada suscripción.
- `POST /api/suscripciones` (`{ tarjetaId, planId, periodicidad, cuponCodigo? }`):
  a diferencia de `/api/checkout`/`/api/citas` (flujos de invitado), este
  endpoint SÍ requiere autenticación — exige `Authorization: Bearer <access_token>`
  de la sesión de Supabase del dueño de la tarjeta (verificado con
  `supabase.auth.getUser(token)`). Calcula el ranking real de la tarjeta entre
  las del usuario (NO reutiliza `posicion_tarjeta_para_usuario()`: esa función
  está pensada para "qué posición tendría una tarjeta nueva", no para rankear
  una ya existente), inserta `suscripciones` en 'pendiente' antes de llamar a
  Mercado Pago, y guarda `preapproval_id` al volver.
- Regla de combinación de descuentos (tarjeta adicional + cupón): **se aplica el
  mayor de los dos, no se suman** — confirmado explícitamente con el cliente.
  Al ser un cobro recurrente, acumular descuentos indefinidamente cada ciclo es
  más riesgoso que en una compra única.
- Cupón reutiliza la tabla `cupones` ya existente (mismo flujo que el pago único
  viejo de tarjeta). Se guarda en `suscripciones.cupon_codigo` (columna nueva,
  migración `20260717210000_add_suscripciones_cupon_codigo.sql`) para trazabilidad.
- Webhook: `/api/mercadopago/webhook` ahora bifurca por tipo de notificación —
  `payment` (como siempre) vs `subscription_preapproval` (nuevo, delegado a
  `lib/confirmar-suscripcion.ts`). Actualiza `suscripciones.estado` y mantiene
  `tarjetas.plan_id` sincronizado en LAS DOS direcciones: lo asigna al quedar
  `autorizada`, y lo vuelve a `null` en cualquier otro estado (pausada,
  cancelada, vencida) — no hay plan gratuito al que "bajar". Con idempotencia y
  protección contra notificaciones fuera de orden (no regresa un estado terminal).
- Gracias a que el caché (`tarjetas.plan_id`) se mantiene sincronizado en ambas
  direcciones, el código que lo lee para gating de features (comisión de citas en
  `confirmar-pago.ts`, límite `servicios_agendables_max` en `agenda-servicios.tsx`)
  **no necesita consultar `suscripciones` por separado** — ambos ya manejan `null`
  de forma fail-closed (sin plan confirmado = sin acceso, no "sin límite"). Riesgo
  residual aceptado: esto depende de que el webhook llegue, mismo modelo que ya
  acepta el resto del código de pagos (no hay job de reconciliación).
- Pendiente (no construido en esta tarea, fuera de alcance): el botón/UI en el
  editor que dispare `POST /api/suscripciones` (el "upgrade de plan"), y una
  página de confirmación dedicada — `back_url` hoy vuelve a `/editar/[tarjetaId]`
  sin más, no hay pantalla de éxito tipo `/pago/exito` para suscripciones.

## Agenda de servicios
- Pago OPCIONAL por servicio, default = contra entrega (`requiere_pago_inmediato: false`).
- Duración variable por servicio, definida por el dueño.
- Disponibilidad híbrida: horario semanal recurrente (`disponibilidad_semanal`) +
  excepciones puntuales (`disponibilidad_excepciones`), definida en la hora LOCAL del
  dueño. `tarjetas.zona_horaria` (texto IANA, default `America/Mexico_City`) es la
  fuente de verdad para convertir esa hora local a UTC; `src/lib/agenda.ts` hace la
  conversión con `Intl.DateTimeFormat` nativo (sin librería de fechas nueva).
- Comisión modelo tipo Didi/Rappi: corte periódico MANUAL vía tabla `liquidaciones`,
  admin marca como pagado tras transferir manualmente. Sin automatización de
  transferencias aún.
- Las páginas `/pago/exito`, `/pago/pendiente` y `/pago/error` son compartidas entre
  el pago de una tarjeta y el pago opcional de una cita: bifurcan según `tipo`
  (`"tarjeta" | "cita"`, derivado del prefijo de `external_reference` en Mercado
  Pago) devuelto por `confirmarPagoDesdeRedirect`. Los datos de despliegue de la
  cita (servicio, fecha/hora en la zona horaria de la tarjeta, slug para volver a
  agendar) se leen aparte con `lib/citas.ts` (`getCitaParaConfirmacion`), una
  lectura de solo presentación con service role — no reimplementa nada de
  `confirmar-pago.ts`.
- Editor de agenda (CRUD servicios/horario/excepciones) en
  `src/components/tarjeta/agenda-servicios.tsx`, sección "Agenda" de `TarjetaForm`
  (solo visible en modo edición, una tarjeta nueva sin guardar no tiene dónde
  colgar servicios). Escribe directo a Supabase desde el cliente (RLS de owner ya
  lo permite, sin endpoint server-side) con actualización optimista de estado +
  reversión si falla. Valida `servicios_agendables_max` del plan vigente antes de
  permitir crear un servicio nuevo, con mensaje de upsell si se llegó al límite.
- Si `tarjeta.plan_id` es `null` (nunca hubo suscripción autorizada, o se
  pausó/canceló), la sección de Agenda se bloquea ENTERA con un mensaje de
  "necesitás un plan activo" — no solo el límite de servicios — y ni siquiera
  consulta Supabase.

## Patrón de UI del editor principal (TarjetaForm)
- Reescrito para seguir el patrón Linktree: en **desktop**, sin cambios (grid de 2
  columnas, formulario izquierda + preview sticky derecha, accordion de
  `@base-ui/react/accordion`). En **mobile**, el preview ocupa toda la pantalla
  (`fixed inset-0`, sin el mockup de teléfono) y los controles bajan a una barra
  fija inferior: botón "Guardar"/"Crear" siempre visible + una fila de tabs
  horizontal scrolleable (uno por sección). Tocar un tab abre un `Drawer` de
  `@base-ui/react/drawer` (bottom sheet) con los controles de esa sección sobre
  el preview — **no se agregó ninguna librería nueva**, Base UI (ya usado para
  Accordion/Dialog/Menu) trae un primitivo Drawer nativo con swipe-to-dismiss.
- El toggle viejo "Modo edición / Ver tarjeta" en mobile se eliminó (redundante
  con el preview ya siempre visible); su contenido (QR + compartir) ahora es un
  tab más, "Compartir". En desktop el toggle sigue igual que siempre.
- Cada sección define su JSX **una sola vez** (`contenidoDiseno`,
  `contenidoServicios`, etc. en `tarjeta-form.tsx`) y se reutiliza tanto en el
  `Accordion.Panel` de desktop como en el `Drawer.Popup` de mobile — nada
  duplicado entre los dos shells.
- Esta es la referencia a seguir para cualquier sección nueva del editor
  (agregar un id al array `SECCIONES`, no reinventar el patrón). "Agenda" ya se
  construyó así.

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
- Migración `20260717100000_add_agenda_servicios.sql` (`servicios_agendables`,
  `disponibilidad_semanal`, `disponibilidad_excepciones`, `citas`,
  `liquidaciones`): APLICADA.
- Migración `20260717180000_add_plan_default_y_zona_horaria.sql` (default de
  `tarjetas.plan_id` a "presencia" + backfill de tarjetas existentes,
  `tarjetas.zona_horaria`): APLICADA.
- Migración `20260717210000_add_suscripciones_cupon_codigo.sql`
  (`suscripciones.cupon_codigo`): DISEÑADA, AÚN NO aplicada contra la base de datos.
- Migración `20260717230000_drop_default_plan_id_tarjetas.sql` (quita el DEFAULT de
  `tarjetas.plan_id`): DISEÑADA, AÚN NO aplicada contra la base de datos.

## Pendiente técnico sin resolver
- `eventos_metricas` no permite insert desde authenticated/anon a propósito (por
  diseño, evita inflar métricas). Falta crear el endpoint server-side con
  `service_role_key` que inserte eventos — `citas` (`/api/citas`) y `suscripciones`
  (`/api/suscripciones`) ya tienen su endpoint propio, este es el que falta.
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
