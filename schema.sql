-- ============================================================================
-- mitarjeta: tabla `tarjetas`
-- Guarda tanto tarjetas de presentación 'personal' (profesionales)
-- como fichas 'empresarial' (negocios) en una sola tabla.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.tarjetas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  tipo text not null check (tipo in ('personal', 'empresarial')),
  user_id uuid references auth.users(id) on delete set null,
  datos_contacto jsonb not null default '{}'::jsonb,
  identidad_visual jsonb not null default '{}'::jsonb,
  metodo_pago text check (metodo_pago in ('mercado_pago', 'transferencia')),
  estado_pago text not null default 'pendiente' check (estado_pago in ('pendiente', 'aprobado', 'rechazado')),
  publicado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tarjetas_user_id_idx on public.tarjetas (user_id);
create index if not exists tarjetas_tipo_idx on public.tarjetas (tipo);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.tarjetas enable row level security;

-- Cualquiera puede leer una tarjeta ya publicada (es la página pública /[slug]).
create policy "tarjetas_select_publicadas"
  on public.tarjetas for select
  using (publicado = true);

-- El dueño autenticado siempre puede ver sus propias tarjetas, publicadas o no.
create policy "tarjetas_select_propias"
  on public.tarjetas for select
  using (auth.uid() = user_id);

-- Flujo de invitado: cualquiera puede crear una tarjeta sin haberse registrado.
-- Si el request está autenticado, solo puede crearla a su propio nombre.
create policy "tarjetas_insert_invitado_o_propia"
  on public.tarjetas for insert
  with check (user_id is null or auth.uid() = user_id);

-- El dueño autenticado puede editar su propia tarjeta.
create policy "tarjetas_update_propia"
  on public.tarjetas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reclamo de una tarjeta creada como invitado: un usuario recién autenticado
-- puede tomar posesión de una tarjeta que todavía no tiene dueño.
create policy "tarjetas_reclamar_sin_dueno"
  on public.tarjetas for update
  using (user_id is null)
  with check (auth.uid() = user_id);

-- Nota: no hay policy de delete -> por defecto nadie puede borrar tarjetas
-- desde el cliente (anon/authenticated). Usar el service role si hace falta.

-- Nota: las imágenes (avatar/banner) se suben a Cloudinary, no a Supabase
-- Storage; no hace falta ningún bucket acá.
