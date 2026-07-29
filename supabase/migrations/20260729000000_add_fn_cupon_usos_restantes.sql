-- ============================================================================
-- Migración: fn_cupon_usos_restantes(p_codigo) — expone SOLO el número de
-- usos restantes de un cupón, para el contador real del home ("Quedan X
-- cupones con 15% de descuento", cupón de lanzamiento LINKARD15).
--
-- Mismo patrón que fn_cupon_es_valido() (20260726000000_add_cupones_avanzado.sql):
-- security definer para que anon/authenticated puedan invocarla sin
-- necesitar una policy de select sobre cupon_usos (que expondría
-- afiliado_nombre/montos a cualquier visitante del home). Devuelve
-- únicamente un integer (o null) — nada de nombres, montos ni fechas.
--
-- 100% ADITIVA: solo una función nueva, no toca ninguna tabla.
-- ============================================================================

begin;

create or replace function public.fn_cupon_usos_restantes(p_codigo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupon record;
  v_usos_actuales integer;
begin
  select id, limite_usos
    into v_cupon
    from public.cupones
    where codigo = upper(trim(p_codigo));

  -- Null tanto si el código no existe como si no tiene límite de usos —
  -- en ambos casos no hay un número restante que mostrar. El home decide
  -- qué hacer con null (ocultar el contador o cambiar el copy).
  if not found or v_cupon.limite_usos is null then
    return null;
  end if;

  select count(*) into v_usos_actuales
    from public.cupon_usos
    where cupon_id = v_cupon.id;

  -- greatest(...,0): piso defensivo si algún día el conteo real superara
  -- el límite (ej. condición de carrera entre dos pagos casi simultáneos)
  -- — nunca se muestra un "restante" negativo.
  return greatest(v_cupon.limite_usos - v_usos_actuales, 0);
end;
$$;

grant execute on function public.fn_cupon_usos_restantes(text) to anon, authenticated;

commit;
