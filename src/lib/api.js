import { supabase, supabaseConfigError } from './supabase'

export async function listarProveedores(empresaId) {
  if (!supabase) throw new Error(supabaseConfigError)
  const { data, error } = await supabase.from('proveedores').select('id,nombre,identificacion').eq('empresa_id', empresaId).order('nombre')
  if (error) throw error
  return data
}

export async function listarFacturas(empresaId) {
  if (!supabase) throw new Error(supabaseConfigError)
  const { data, error } = await supabase.from('facturas').select('id,numero,fecha_emision,moneda,subtotal,impuesto,total,estado,created_at,proveedores(nombre,identificacion)').eq('empresa_id', empresaId).order('fecha_emision', { ascending: false })
  if (error) throw error
  return data
}

export async function guardarFactura(factura, empresaId) {
  if (!supabase) throw new Error(supabaseConfigError)
  const { error } = await supabase.from('facturas').insert({ ...factura.toInsert(), empresa_id: empresaId })
  if (error) throw error
}

export async function listarEmpresas() {
  if (!supabase) throw new Error(supabaseConfigError)
  const { data, error } = await supabase.from('empresa_miembros').select('empresa_id,rol,empresas(id,nombre)').order('created_at')
  if (error) throw error
  return data.map(item => ({ id: item.empresa_id, rol: item.rol, nombre: item.empresas?.nombre })).filter(item => item.nombre)
}

export async function crearEmpresa(nombre) {
  if (!supabase) throw new Error(supabaseConfigError)
  const { data, error } = await supabase.rpc('create_empresa_for_current_user', { empresa_nombre: nombre.trim() })
  if (error) throw error
  return data
}

export async function guardarProveedor({ nombre, identificacion }, empresaId) {
  if (!supabase) throw new Error(supabaseConfigError)
  const cleanName = nombre?.trim()
  const cleanId = identificacion?.trim() || null
  if (!cleanName || cleanName.length < 2) throw new Error('El nombre del proveedor debe tener al menos 2 caracteres.')
  const { error } = await supabase.from('proveedores').insert({ nombre: cleanName, identificacion: cleanId, empresa_id: empresaId })
  if (error) throw error
}

/** Contrato de respuesta: { ok: boolean, data?: unknown, error?: string } */
export async function enviarChat(message) {
  const endpoint = import.meta.env.VITE_CHAT_FUNCTION_URL || (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-n8n` : '')
  if (!endpoint) return { ok: false, error: 'El chat aún no está configurado: define VITE_CHAT_FUNCTION_URL después de desplegar la función segura.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Inicia sesión para usar el chat.' }
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ message }) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) return { ok: false, error: body.error || 'No fue posible contactar el agente.' }
  return body
}
