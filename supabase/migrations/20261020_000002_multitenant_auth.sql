-- Multi-tenant ownership for the authenticated application.
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 2 and 160),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.empresa_miembros (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'admin' check (rol in ('admin', 'operador', 'lector')),
  created_at timestamptz not null default now(),
  primary key (empresa_id, user_id)
);

alter table public.proveedores add column empresa_id uuid references public.empresas(id) on delete restrict;
alter table public.facturas add column empresa_id uuid references public.empresas(id) on delete restrict;
alter table public.proveedores alter column empresa_id set not null;
alter table public.facturas alter column empresa_id set not null;
create index proveedores_empresa_id_idx on public.proveedores (empresa_id);
create index facturas_empresa_fecha_idx on public.facturas (empresa_id, fecha_emision desc);

create trigger empresas_updated_at before update on public.empresas for each row execute function public.set_updated_at();

alter table public.empresas enable row level security;
alter table public.empresa_miembros enable row level security;

drop policy "authenticated can read proveedores" on public.proveedores;
drop policy "authenticated can insert proveedores" on public.proveedores;
drop policy "authenticated can read facturas" on public.facturas;
drop policy "authenticated can insert facturas" on public.facturas;

create policy "users read their membership" on public.empresa_miembros for select to authenticated using ((select auth.uid()) = user_id);
create policy "owners add initial membership" on public.empresa_miembros for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = (select auth.uid()))
);
create policy "users read their companies" on public.empresas for select to authenticated using (
  owner_id = (select auth.uid()) or exists (select 1 from public.empresa_miembros m where m.empresa_id = id and m.user_id = (select auth.uid()))
);
create policy "users create own companies" on public.empresas for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "members read proveedores" on public.proveedores for select to authenticated using (
  exists (select 1 from public.empresa_miembros m where m.empresa_id = proveedores.empresa_id and m.user_id = (select auth.uid()))
);
create policy "members insert proveedores" on public.proveedores for insert to authenticated with check (
  exists (select 1 from public.empresa_miembros m where m.empresa_id = proveedores.empresa_id and m.user_id = (select auth.uid()))
);
create policy "members read facturas" on public.facturas for select to authenticated using (
  exists (select 1 from public.empresa_miembros m where m.empresa_id = facturas.empresa_id and m.user_id = (select auth.uid()))
);
create policy "members insert facturas" on public.facturas for insert to authenticated with check (
  exists (select 1 from public.empresa_miembros m where m.empresa_id = facturas.empresa_id and m.user_id = (select auth.uid()))
);

alter function public.set_updated_at() set search_path = pg_catalog, public;
