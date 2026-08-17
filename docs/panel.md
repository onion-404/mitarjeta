# Header global, /mi-cuenta, shells admin, alta manual de tarjetas

> Detalle de paneles — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

## Header global + /mi-cuenta
- `src/components/header-global.tsx` (`<HeaderGlobal />`, client): logo a la izquierda; sin
  sesión, botón que abre un `Dialog` con `<AuthMethods redirectTo={pathname}>` (no hay ruta
  genérica de login reusable, `/login` es solo admin); con sesión, avatar (foto de la tarjeta
  más reciente del usuario, o iniciales) con `Menu` → "Mi Cuenta"/"Cerrar sesión". Variant
  `"flotante"` (usada en el home) redefine `--foreground`/`--primary`/`--muted`/`--border` y
  usa clases explícitas para el botón outline (blanco sobre fondo oscuro).
- Prop `ocultarLoginSinSesion` (pasada por `/crear` y `/editar/[id]` como
  `session === null`): evita el login duplicado en páginas que ya muestran su propio
  `<AuthMethods>` inline.
- `/mi-cuenta/page.tsx`: gate con `<AuthMethods redirectTo="/mi-cuenta">` inline (no redirect a
  `/login`). Contenido: email de sesión, lista de tarjetas, "Crear nueva tarjeta" → `/planes`,
  logout.
- `layout.tsx` (raíz) deliberadamente sin `<HeaderGlobal>` global — se agrega página por
  página para no afectar `/[slug]` (tarjeta pública), que NO debe llevarlo.

## Shell de paneles admin/mi-cuenta (rediseño completo, reemplaza dashboards de una sola página)
- Patrón Vercel/Stripe Dashboard: rutas propias por sección (no tabs de estado React).
- `src/components/panel/panel-shell.tsx` (`<PanelShell titulo tabs>`) + `panel-tabs.ts`
  (`ADMIN_TABS`/`MI_CUENTA_TABS`/`GANANCIAS_TAB` condicional). Desktop: sidebar fijo. Mobile:
  topbar + hamburguesa → `Drawer` desde la izquierda (`swipeDirection="left"`, mismo
  primitivo que el bottom-sheet de `TarjetaForm`, configurado distinto a propósito).
- `/admin/layout.tsx`: auth-gate único (`ADMIN_EMAIL`) + `<HeaderGlobal />` + `<PanelShell>`.
  Rutas: `/admin/dashboard` (Resumen, stat tiles), `/admin/tarjetas` (listado filtrable +
  gráficos de distribución por plan/uso de agenda), `/admin/suscripciones` (listado +
  MRR/churn), `/admin/cupones`, `/admin/afiliados`, `/admin/testimonios`,
  `/admin/cobro-manual`, `/admin/configuracion` (CRUD de `planes.precio_mensual/anual` +
  `descuento_tarjeta_adicional_pct`).
- `/mi-cuenta/layout.tsx`: mismo patrón con `<AuthMethods>` inline si `session === null`.
  Rutas: `/mi-cuenta` (Resumen), `/tarjetas`, `/estadisticas` (agregado multi-tarjeta),
  `/suscripcion` (Stripe Customer Portal), `/cuenta`, `/ganancias` (condicional, solo si el
  email matchea un afiliado activo).
- `src/components/panel/filtro-tarjetas.tsx` (`<FiltroTarjetas tarjetas mostrarFiltroPlan?
  hrefBase?>`) reutilizado entre `/admin/tarjetas` (con plan, `hrefBase="/admin/tarjetas"`) y
  `/mi-cuenta/tarjetas` (sin plan, `hrefBase="/editar"` default).
- Home: se quitó la sección de precios del modelo viejo de pago único anual (`configuracion.
  precio_regular/precio_lanzamiento/promocion_*` — columnas huérfanas, no borradas de la
  tabla; `PromoCountdown` sin caller, no borrado).

## Panel admin: alta manual de tarjetas + reasignación de dueño
- Nueva página `/admin/tarjetas/[id]` (detalle) — no se tocó `/editar/[id]` (gate hardcodeado
  `user_id !== session.user.id` sin bypass de admin, UI orientada al dueño, no se mezcla con
  herramientas admin). `FiltroTarjetas` ganó prop `hrefBase`.
- `POST /api/admin/activar-manual` (gate `ADMIN_EMAIL`): si ya existe suscripción `autorizada`/
  `pausada` → `409`. Si existe `pendiente` → la reutiliza con `UPDATE`. `descuento_aplicado`
  se clampea a 0 si el costo ingresado supera el precio de lista. `fecha_renovacion` = fecha
  de pago + 1 mes/año según periodicidad. Requiere migración `20260729010000_add_
  suscripciones_manual.sql` (aplicada, agrega `'manual'` al constraint de `proveedor` +
  `registrado_por`/`nota_manual`).
- `POST /api/admin/reasignar-tarjeta`: busca usuario por email exacto contra
  `{SUPABASE_URL}/auth/v1/admin/users?filter=<email>` con `fetch` directo (la SDK instalada,
  2.110.2, no expone filtro por email en `listUsers()`). `GET /api/admin/usuario-por-id`
  resuelve el email del dueño actual para mostrarlo antes de reasignar.
- Ver docs/pagos.md para el botón "Cancelar suscripción manual" agregado a esta misma página
  (2026-08-13).
