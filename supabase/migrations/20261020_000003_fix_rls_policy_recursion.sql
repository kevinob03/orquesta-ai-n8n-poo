-- Avoid recursive RLS evaluation when a policy needs to verify company membership.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_empresa_member(target_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.empresa_miembros m
    where m.empresa_id = target_empresa_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_empresa_member(uuid) from public;
grant execute on function private.is_empresa_member(uuid) to authenticated;

drop policy "users read their companies" on public.empresas;
drop policy "members read proveedores" on public.proveedores;
drop policy "members insert proveedores" on public.proveedores;
drop policy "members read facturas" on public.facturas;
drop policy "members insert facturas" on public.facturas;

create policy "users read their companies" on public.empresas for select to authenticated using (
  owner_id = (select auth.uid()) or private.is_empresa_member(id)
);
create policy "members read proveedores" on public.proveedores for select to authenticated using (private.is_empresa_member(empresa_id));
create policy "members insert proveedores" on public.proveedores for insert to authenticated with check (private.is_empresa_member(empresa_id));
create policy "members read facturas" on public.facturas for select to authenticated using (private.is_empresa_member(empresa_id));
create policy "members insert facturas" on public.facturas for insert to authenticated with check (private.is_empresa_member(empresa_id));
