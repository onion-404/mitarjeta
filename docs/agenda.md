# Agenda de servicios

> Detalle de agenda — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

## Agenda de servicios
- Pago OPCIONAL por servicio, default contra entrega (`requiere_pago_inmediato: false`).
  Duración variable por servicio.
- Disponibilidad híbrida: `disponibilidad_semanal` (recurrente) + `disponibilidad_excepciones`
  (puntual), en hora LOCAL del dueño (`tarjetas.zona_horaria`, default
  `America/Mexico_City`). Conversión a UTC con `Intl.DateTimeFormat` nativo en `lib/agenda.ts`
  (sin librería de fechas nueva).
- Comisión modelo Didi/Rappi: corte manual vía tabla `liquidaciones`, admin marca pagado tras
  transferir — sin automatización de transferencias.
- `/pago/exito`, `/pago/pendiente`, `/pago/error` bifurcan por `tipo` (`"tarjeta"|"cita"`,
  del prefijo de `external_reference`). Datos de cita leídos con `lib/citas.ts`
  (`getCitaParaConfirmacion`, service role, solo presentación).
- Editor de agenda: `src/components/tarjeta/agenda-servicios.tsx`, sección "Agenda" de
  `TarjetaForm` (solo en edición). Escribe directo a Supabase (RLS de owner) con optimistic
  update + reversión si falla. Valida `servicios_agendables_max` del plan antes de crear.
- Si `tarjeta.plan_id` es `null`, la sección Agenda se bloquea ENTERA (mensaje de upsell), sin
  consultar Supabase.
- **Vista pública**: `TarjetaCard` con props `permitirAgendar`/`tarjetaId`/`zonaHoraria` (solo
  `/[slug]/page.tsx` las pasa). Cada servicio abre `reservar-servicio.tsx` (Dialog Base UI) →
  fecha → `GET /api/citas/disponibilidad` → datos del cliente → `POST /api/citas`. Sin pago:
  confirmación en el modal. Con pago: redirect a `initPoint`. 409 (horario tomado) muestra
  mensaje claro sin perder datos ya escritos.
- `obtenerSlotsDisponibles()` filtra horarios de HOY ya pasados (`Date.now()`) antes de
  devolverlos.
- `formatearFechaHoraLocal`/`formatearHoraLocal` viven en `lib/fecha.ts` (sin `"server-only"`,
  usado tanto en servidor como cliente).
- **Gating por plan en la vista pública, doble capa**: `getServiciosAgendablesActivos()`
  (`lib/tarjetas.ts`) filtra `plan_id IS NOT NULL` a nivel de aplicación; las policies
  `servicios_agendables_select_publica`, `disponibilidad_semanal_select_publica`,
  `disponibilidad_excepciones_select_publica` también lo exigen a nivel RLS (migración
  `20260725000000_endurecer_rls_servicios_agendables_plan.sql`, aplicada) — no depende de un
  solo punto de acceso.

## Agenda: horarios calculados como un solo calendario compartido, colchón por servicio, sin "paso" configurable (2026-08-10, iterado varias veces)
- **Modelo de negocio confirmado explícitamente con el cliente**: un solo proveedor (una
  persona) atiende TODOS los servicios agendables de la tarjeta — no hay "un calendario por
  servicio", es un único horario compartido. Distintos servicios pueden tener distinta
  duración Y distinto colchón (uno puede necesitar más espacio de preparación/traslado que
  otro), pero nunca pueden chocar entre sí.
- **Iteración de diseño** (registrado para no repetir el camino): primero se agregó un
  `PASO_MINUTOS` configurable POR TARJETA (`tarjetas.intervalo_agenda_minutos`, "cada cuánto
  ofrecer un horario") — el cliente hizo notar que, si duración+colchón de cada servicio ya
  determinan huecos válidos y sin choques, ese campo aparte sobraba y solo agregaba una
  configuración más para explicar. Se sacó por completo del código (`tarjetas.
  intervalo_agenda_minutos` sigue @deprecated en la columna de DB — no se borra, mismo criterio
  que el resto de columnas huérfanas del proyecto — pero no queda ningún caller ni UI).
- **`servicios_agendables.colchon_minutos`** (migración `20260810000000_add_agenda_intervalo_
  colchon.sql`, default 0) — por SERVICIO, no por tarjeta. `<select>` "Colchón" (0-60 min) junto
  a "Duración"/"Precio" en cada servicio de `agenda-servicios.tsx`.
- **Algoritmo final de `obtenerSlotsDisponibles()`** (lib/agenda.ts, reemplaza por completo el
  paso fijo/configurable de antes): para cada día, arranca de las ventanas de disponibilidad
  (horario semanal + excepciones, igual que siempre) convertidas a instantes UTC absolutos, y le
  RESTA cada cita ya ocupada de la tarjeta (`restarIntervalo()`, la misma función que ya usaba
  `construirVentanasDelDia` para bloqueos — funciona igual con milisegundos que con minutos, es
  aritmética de intervalos pura) expandida por el colchón que corresponda (`Math.max` entre el
  colchón de esa cita y el del servicio que se está consultando, mismo criterio que
  `existe_solapamiento_cita`). Sobre cada hueco REALMENTE libre que queda, ofrece horarios
  back-to-back espaciados por `duración + colchón` del servicio consultado — así nunca se
  pierde un hueco real (a diferencia de un paso fijo arbitrario, que podía saltearse un hueco
  que no calzara con ese paso) ni se ofrece algo que choque, sea del mismo servicio o de otro.
  Restar en instantes UTC absolutos (no en minutos-del-día locales) evita cualquier problema de
  un colchón empujando el bloqueo cruzando la medianoche local.
- **Anti-choque entre servicios distintos de la misma tarjeta** (confirmado con el cliente —
  ya era el diseño correcto desde la migración original de agenda, 2026-07-17, no hizo falta
  cambiar nada ahí): tanto `obtenerSlotsDisponibles()` como `existe_solapamiento_cita()` filtran
  las citas ocupadas por `tarjeta_id`, **nunca por `servicio_id`** — si el Servicio 1 está
  agendado de 10:00 a 11:00, esa franja queda bloqueada para CUALQUIER otro servicio de la misma
  tarjeta (un solo proveedor no puede atender dos cosas a la vez).
  - `existe_solapamiento_cita()` (SQL, `create or replace function`) gana `p_colchon_minutos`
    (el colchón del servicio que se está por agendar, ya en mano de `/api/citas/route.ts` —
    único caller, actualizado en el mismo commit). Para cada cita YA ocupada, hace `join` contra
    `servicios_agendables` para saber SU colchón y usa el mayor entre ambos (`greatest()`).
  - `obtenerSlotsDisponibles()`: la consulta de `citas` ocupadas embebe
    `servicios_agendables(colchon_minutos)` (relación FK ya existente, embed automático de
    PostgREST) para saber el colchón de CADA cita ya tomada.
- **Validación de ventanas cortas** (`agenda-servicios.tsx`): por cada servicio activo, compara su
  `duracion_minutos` contra cada rango de "Horario semanal" y cada excepción "apertura_extra" —
  si alguno es más corto, muestra un aviso inline ("Este servicio (60 min) no entra en Martes
  10:00–10:30 (30 min)...") justo debajo de la duración del servicio, en vez de que el dueño lo
  descubra con una lista vacía sin explicación.
- **Preview de próximos horarios reales**: botón "Ver próximos horarios" por servicio — reusa el
  endpoint público existente `GET /api/citas/disponibilidad` (mismo que ya consume
  `reservar-servicio.tsx` al agendar) en vez de duplicar el cálculo de `lib/agenda.ts` (server-only)
  en un componente cliente. Sin caché a propósito (se vuelve a pedir cada vez que se abre, así
  nunca muestra algo desactualizado tras editar horario/colchón).
- Migración `20260810000000_add_agenda_intervalo_colchon.sql` **APLICADA en producción**
  (confirmado desde esta sesión con una consulta real: `servicios_agendables.colchon_minutos`
  existe con su default, `existe_solapamiento_cita` acepta `p_colchon_minutos`;
  `tarjetas.intervalo_agenda_minutos` también existe pero quedó sin caller, ver arriba).
  Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 Sin verificar en
  navegador real todavía — pendiente probar con servicios de distinta duración/colchón reales,
  confirmando que los huecos libres se calculan bien y que ningún horario ofrecido choca.
