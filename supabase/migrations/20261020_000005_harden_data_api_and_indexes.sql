-- Keep Data API privileges explicit and limited to the authenticated demo scope.
revoke all on table public.empresas from anon;
revoke all on table public.empresa_miembros from anon;
revoke all on table public.proveedores from anon;
revoke all on table public.facturas from anon;

grant select, insert on table public.empresas to authenticated;
grant select, insert on table public.empresa_miembros to authenticated;
grant select, insert on table public.proveedores to authenticated;
grant select, insert on table public.facturas to authenticated;

-- Expose a non-privileged RPC wrapper while keeping the privileged implementation
-- in the private schema. The private function validates auth.uid() itself.
create or replace function public.create_empresa_for_current_user(empresa_nombre text)
returns public.empresas
language sql
volatile
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.create_empresa_for_current_user(empresa_nombre);
$$;

revoke all on function public.create_empresa_for_current_user(text) from public;
grant execute on function public.create_empresa_for_current_user(text) to authenticated;

-- Cover both foreign keys reported by the Supabase performance advisor.
create index if not exists empresas_owner_id_idx
  on public.empresas (owner_id);

create index if not exists empresa_miembros_user_id_idx
  on public.empresa_miembros (user_id);
