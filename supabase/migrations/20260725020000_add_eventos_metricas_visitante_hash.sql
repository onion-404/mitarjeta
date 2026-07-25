-- ============================================================================
-- Migración: agrega `visitante_hash` a `eventos_metricas` para poder
-- distinguir visitantes únicos de recurrentes en el dashboard del dueño,
-- sin guardar ningún dato personal (IP, user-agent) en crudo.
--
-- Contexto: el endpoint POST /api/eventos (que inserta en esta tabla) calcula
-- server-side, para cada evento, un hash de
-- `IP + user-agent + fecha-UTC-del-día` con una sal que rota diariamente
-- (nunca la IP/user-agent en sí, y el hash de un mismo visitante cambia de
-- un día a otro — no es un identificador estable de largo plazo, a
-- propósito, para minimizar cualquier riesgo de tracking). "Recurrente" se
-- define como: el mismo `visitante_hash` aparece en más de una `fecha`
-- distinta (columna `created_at::date`) para la misma `tarjeta_id` — como
-- el hash rota por día, esto solo funciona comparando por tarjeta, nunca
-- entre tarjetas ni across-day linkage del mismo visitante salvo por esa
-- coincidencia de tarjeta+día.
--
-- Nullable a propósito: eventos ya insertados antes de esta migración (no
-- debería haber ninguno todavía, ver CLAUDE.md — el endpoint que escribe acá
-- todavía no existía) y cualquier evento futuro donde no se pueda calcular
-- el hash (ej. request sin IP identificable) quedan con `visitante_hash null`
-- en vez de fallar el insert — un evento sin hash sigue siendo válido para
-- las métricas totales (`metricas_diarias`), solo no aporta a la
-- distinción único/recurrente.
--
-- 100% ADITIVA: una sola columna nueva (nullable, sin default distinto de
-- null) + un índice. No toca ninguna policy existente de `eventos_metricas`
-- (`eventos_metricas_select_propia`, `eventos_metricas_admin_todo`, sin
-- insert para anon/authenticated) ni el trigger de rollup
-- `trg_eventos_metricas_rollup` — el rollup sigue contando por
-- `tipo_evento`, no por visitante.
-- ============================================================================

begin;

alter table public.eventos_metricas
  add column if not exists visitante_hash text;

-- Para el cálculo de único/recurrente por tarjeta: "cuántos días distintos
-- apareció este hash para esta tarjeta" y, en general, cualquier lookup por
-- tarjeta+hash.
create index if not exists eventos_metricas_tarjeta_visitante_idx
  on public.eventos_metricas (tarjeta_id, visitante_hash);

commit;
