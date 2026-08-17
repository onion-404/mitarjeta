@AGENTS.md

# Linkard (mitarjeta) — índice

> Índice denso. Detalle profundo vive en docs/, cargado bajo demanda. Actualizado: 2026-08-17.
> Historial de verificaciones/capturas/logs de sesiones pasadas → HISTORIAL.md.

## Producto
- Marca **Linkard** (linkard.mx). Repo/DB/Cloudinary/apps MP siguen "mitarjeta" a propósito —
  no renombrar.
- 🔴 Confirmar `NEXT_PUBLIC_SITE_URL=https://linkard.mx` en Vercel.
- Marca, logo, OG, legal, home/testimonios → docs/producto.md

## Modelo de negocio
- Link-in-bio + agenda + productos. Plan vive en la TARJETA, no en el usuario.
- 2 planes (`connect`/`growth`, tabla `planes`): mismas features de personalización en ambos;
  solo Growth tiene métricas. Sin tier gratuito, sin creación como invitado.
- Planes, copy de marketing, voseo→tuteo → docs/negocio.md

## Pagos — dos flujos, nunca mezclar
- Checkout Pro (Mercado Pago) = pagos únicos (productos, citas, cobro manual admin).
- Stripe = suscripción recurrente del plan de la tarjeta (proveedor activo).
- Detalle Stripe/MP histórico/flujo compra/periodicidad/cancelar manual → docs/pagos.md

## Agenda
- Un solo calendario compartido por tarjeta (no por servicio). Duración+colchón por servicio,
  sin "paso" fijo configurable.
- Detalle completo → docs/agenda.md

## Base de datos
- Supabase producción única, sin staging.
- Estado de migraciones aplicadas/pendientes → docs/db.md

## Editor de tarjeta (TarjetaForm)
- Patrón Linktree: accordion desktop, drawer mobile. Sistema unificado de Botones (5 tipos +
  Agenda como 6º), Multimedia, personalización avanzada, ColorPicker.
- Historial completo de features del editor → docs/editor.md

## Dashboards / métricas
- `POST /api/eventos` instrumenta clicks/vistas. Dashboard dueño gateado por plan (Growth).
  Dashboard admin con MRR/churn.
- Detalle → docs/metricas.md

## Paneles (header, /mi-cuenta, /admin)
- Shell tipo Vercel/Stripe Dashboard (sidebar desktop, drawer mobile). Alta manual de
  tarjetas + reasignación de dueño en `/admin/tarjetas/[id]`.
- Detalle → docs/panel.md

## Cupones y afiliados
- Cupones avanzados (`fn_cupon_es_valido`, límites/vencimiento) + afiliados con comisión
  RECURRENTE sobre monto neto.
- Detalle → docs/afiliados.md

## Diferido — NO construir sin instrucción explícita
- Google Calendar, wallet nativo (Apple/Google), migración de pago único legacy.
- Confirmación de agenda por WhatsApp vía Make: YA construida (no es el recordatorio
  programado que sugiere el copy de marketing).
- Detalle → docs/diferido.md

## Pendientes técnicos (consolidado, lista viva)
→ docs/pendientes.md — actualizar ahí siempre, no acá.

## Notas de proceso
- Migraciones: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`, aditivas, BEGIN/COMMIT.
  Backup `pg_dump` antes de migrar (plan free, sin backups automáticos).
- Sin `supabase` CLI ni `DATABASE_URL` vinculados — usuario corre migraciones manual; su
  confirmación se toma como palabra salvo verificación propia desde la sesión.

## Mantenimiento
- Índice, no almacén. El detalle vive en docs/. Escribir denso, sin prosa.
- Contenido nuevo: si es NÚCLEO, 1 línea aquí; si es DETALLE, archivo en docs/ + puntero.
- Decisiones nuevas → actualizar el docs/ correspondiente, nunca engordar este archivo.
- Si CLAUDE.md se acerca a 150 líneas, mover contenido a docs/, no recortar prosa.
