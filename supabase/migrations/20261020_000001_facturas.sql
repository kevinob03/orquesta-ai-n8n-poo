-- Demo segura: las políticas requieren un usuario autenticado. El MVP no implementa login,
-- por lo que el cliente queda bloqueado hasta integrar Supabase Auth o ejecutar pruebas SQL.
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 2 and 160),
  identificacion text unique check (identificacion is null or char_length(trim(identificacion)) between 5 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete restrict,
  numero text not null check (char_length(trim(numero)) between 1 and 80),
  fecha_emision date not null check (fecha_emision <= current_date),
  moneda text not null default 'CRC' check (moneda in ('CRC', 'USD')),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  impuesto numeric(14,2) not null check (impuesto >= 0),
  total numeric(14,2) not null check (total >= 0 and total = subtotal + impuesto),
  estado text not null default 'registrada' check (estado in ('registrada', 'validada', 'rechazada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proveedor_id, numero)
);

create index facturas_fecha_emision_idx on public.facturas (fecha_emision desc);
create index facturas_proveedor_id_idx on public.facturas (proveedor_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger proveedores_updated_at before update on public.proveedores for each row execute function public.set_updated_at();
create trigger facturas_updated_at before update on public.facturas for each row execute function public.set_updated_at();

alter table public.proveedores enable row level security;
alter table public.facturas enable row level security;
-- No hay políticas para anon: la clave pública no da acceso. Estas políticas se activarán
-- automáticamente para usuarios autenticados cuando el proyecto incorpore login y ownership.
create policy "authenticated can read proveedores" on public.proveedores for select to authenticated using (true);
create policy "authenticated can insert proveedores" on public.proveedores for insert to authenticated with check (true);
create policy "authenticated can read facturas" on public.facturas for select to authenticated using (true);
create policy "authenticated can insert facturas" on public.facturas for insert to authenticated with check (true);
