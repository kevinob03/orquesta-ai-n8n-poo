-- Create the company and its first administrator atomically to avoid orphan records on retries.
create or replace function private.create_empresa_for_current_user(empresa_nombre text)
returns public.empresas
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  existing_empresa public.empresas;
  created_empresa public.empresas;
begin
  if current_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;
  if char_length(trim(empresa_nombre)) not between 2 and 160 then
    raise exception 'Nombre de empresa inválido';
  end if;

  select e.* into existing_empresa
  from public.empresas e
  join public.empresa_miembros m on m.empresa_id = e.id
  where e.owner_id = current_user_id
    and m.user_id = current_user_id
    and lower(e.nombre) = lower(trim(empresa_nombre))
  limit 1;
  if found then
    return existing_empresa;
  end if;

  insert into public.empresas (nombre, owner_id)
  values (trim(empresa_nombre), current_user_id)
  returning * into created_empresa;
  insert into public.empresa_miembros (empresa_id, user_id, rol)
  values (created_empresa.id, current_user_id, 'admin');
  return created_empresa;
end;
$$;

revoke all on function private.create_empresa_for_current_user(text) from public;
grant execute on function private.create_empresa_for_current_user(text) to authenticated;
