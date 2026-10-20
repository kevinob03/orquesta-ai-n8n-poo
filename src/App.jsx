import React, { useEffect, useState } from 'react'
import AuthPanel from './components/AuthPanel.jsx'
import { Factura } from './domain/Factura'
import { crearEmpresa, enviarChat, guardarFactura, guardarProveedor, listarEmpresas, listarFacturas, listarProveedores } from './lib/api'
import { supabase, supabaseConfigError } from './lib/supabase'

const initialForm = { proveedor_id: '', numero: '', fecha_emision: '', moneda: 'CRC', subtotal: '', impuesto: '', total: '' }
const initialProveedor = { nombre: '', identificacion: '' }
const money = (value, currency) => new Intl.NumberFormat('es-CR', { style: 'currency', currency }).format(value)

function EmpresaSetup({ user, onReady }) {
  const [nombre, setNombre] = useState(''), [message, setMessage] = useState(''), [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault(); setMessage('')
    if (nombre.trim().length < 2) return setMessage('Indica un nombre de empresa válido.')
    setSaving(true)
    try { await crearEmpresa(nombre); await onReady() } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Primer paso</p><h1>Crea tu empresa</h1><p className="muted">Los proveedores y facturas quedarán aislados dentro de ella.</p><form onSubmit={submit}><label>Nombre de la empresa<input value={nombre} onChange={e => setNombre(e.target.value)} maxLength="160" required autoFocus /></label>{message && <p className="alert error">{message}</p>}<button disabled={saving}>{saving ? 'Creando…' : 'Crear empresa'}</button></form></section></main>
}

function Dashboard({ user, empresa, empresas, onEmpresaChange, onLogout }) {
  const [facturas, setFacturas] = useState([]), [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [form, setForm] = useState(initialForm), [errors, setErrors] = useState({}), [saving, setSaving] = useState(false), [notice, setNotice] = useState('')
  const [proveedor, setProveedor] = useState(initialProveedor), [proveedorSaving, setProveedorSaving] = useState(false)
  const [message, setMessage] = useState(''), [chat, setChat] = useState([]), [chatLoading, setChatLoading] = useState(false)
  async function load() {
    setLoading(true); setError('')
    try { const [f, p] = await Promise.all([listarFacturas(empresa.id), listarProveedores(empresa.id)]); setFacturas(f); setProveedores(p) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [empresa.id])
  function update(field, value) {
    if (field === 'total') return
    setForm(current => {
      const next = { ...current, [field]: value }
      if (field === 'subtotal' || field === 'impuesto') {
        const subtotal = Number(next.subtotal || 0)
        const impuesto = Number(next.impuesto || 0)
        next.total = Number.isFinite(subtotal + impuesto) ? (subtotal + impuesto).toFixed(2) : ''
      }
      return next
    })
    setErrors(current => ({ ...current, [field]: undefined, total: undefined }))
  }
  async function submitFactura(event) {
    event.preventDefault(); setNotice(''); const invoice = new Factura(form); const validation = invoice.validate(); setErrors(validation); if (Object.keys(validation).length) return
    setSaving(true); try { await guardarFactura(invoice, empresa.id); setForm(initialForm); setNotice('Factura registrada.'); await load() } catch (e) { setNotice(`No se guardó: ${e.message}`) } finally { setSaving(false) }
  }
  async function submitProveedor(event) {
    event.preventDefault(); setNotice(''); setProveedorSaving(true)
    try { await guardarProveedor(proveedor, empresa.id); setProveedor(initialProveedor); setNotice('Proveedor registrado.'); await load() } catch (e) { setNotice(`No se guardó: ${e.message}`) } finally { setProveedorSaving(false) }
  }
  async function send(event) {
    event.preventDefault(); const text = message.trim(); if (!text || chatLoading) return
    setChat(items => [...items, { role: 'user', text }]); setMessage(''); setChatLoading(true)
    const result = await enviarChat(text); setChat(items => [...items, { role: 'agent', text: result.ok ? (result.data?.message || JSON.stringify(result.data)) : result.error }]); setChatLoading(false)
  }
  return <main><header><div><p className="eyebrow">orquestAI · {empresa.nombre}</p><h1>Gestión de facturas</h1><p>Sesión: {user.email}</p></div><div className="header-actions">{empresas.length > 1 && <select aria-label="Empresa activa" value={empresa.id} onChange={e => onEmpresaChange(e.target.value)}>{empresas.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>}<button className="secondary" onClick={load} disabled={loading}>Actualizar</button><button className="secondary" onClick={onLogout}>Salir</button></div></header>
    {error && <div className="alert error" role="alert">{error}</div>}
    <section className="grid"><article><h2>Facturas</h2>{loading ? <p>Cargando facturas…</p> : facturas.length === 0 ? <p className="muted">No hay facturas registradas todavía.</p> : <div className="table-wrap"><table><thead><tr><th>Factura</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>{facturas.map(f => <tr key={f.id}><td>{f.numero}</td><td>{f.proveedores?.nombre || '—'}</td><td>{f.fecha_emision}</td><td>{money(f.total, f.moneda)}</td><td><span className="status">{f.estado}</span></td></tr>)}</tbody></table></div>}</article>
      <article><h2>Registrar factura</h2><form onSubmit={submitFactura}>{notice && <p className="alert">{notice}</p>}<label>Proveedor<select value={form.proveedor_id} onChange={e => update('proveedor_id', e.target.value)} disabled={loading || proveedores.length === 0}><option value="">{proveedores.length ? 'Selecciona…' : 'Registra un proveedor primero'}</option>{proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.identificacion ? ` — ${p.identificacion}` : ''}</option>)}</select>{errors.proveedor_id && <small>{errors.proveedor_id}</small>}</label><label>Número<input value={form.numero} onChange={e => update('numero', e.target.value)} maxLength="80" />{errors.numero && <small>{errors.numero}</small>}</label><label>Fecha de emisión<input type="date" value={form.fecha_emision} onChange={e => update('fecha_emision', e.target.value)} />{errors.fecha_emision && <small>{errors.fecha_emision}</small>}</label><label>Moneda<select value={form.moneda} onChange={e => update('moneda', e.target.value)}><option>CRC</option><option>USD</option></select></label><div className="amounts">{['subtotal','impuesto','total'].map(k => <label key={k}>{k[0].toUpperCase() + k.slice(1)}<input type="number" min="0" step="0.01" value={form[k]} onChange={e => update(k, e.target.value)} />{errors[k] && <small>{errors[k]}</small>}</label>)}</div><button disabled={saving || loading || proveedores.length === 0}>{saving ? 'Guardando…' : 'Guardar factura'}</button></form></article>
    </section>
    <section className="lower-grid"><article><h2>Nuevo proveedor</h2><form onSubmit={submitProveedor}><label>Nombre<input value={proveedor.nombre} onChange={e => setProveedor(item => ({ ...item, nombre: e.target.value }))} maxLength="160" required /></label><label>Identificación fiscal <span className="muted">(opcional)</span><input value={proveedor.identificacion} onChange={e => setProveedor(item => ({ ...item, identificacion: e.target.value }))} maxLength="40" /></label><button disabled={proveedorSaving}>{proveedorSaving ? 'Guardando…' : 'Guardar proveedor'}</button></form></article><section className="chat"><h2>Agente orquestador</h2><div className="messages" aria-live="polite">{chat.length === 0 ? <p className="muted">Pregunta por facturas o proveedores. La conexión segura se configura por separado.</p> : chat.map((item, i) => <p className={item.role} key={i}>{item.text}</p>)}</div><form onSubmit={send} className="chat-form"><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Ej.: consulta las facturas de este mes" aria-label="Mensaje para el agente"/><button disabled={chatLoading}>{chatLoading ? 'Enviando…' : 'Enviar'}</button></form></section></section>
  </main>
}

export default function App() {
  const [session, setSession] = useState(null), [authLoading, setAuthLoading] = useState(true), [empresas, setEmpresas] = useState([]), [empresaId, setEmpresaId] = useState(''), [error, setError] = useState('')
  async function loadEmpresas() { try { const data = await listarEmpresas(); setEmpresas(data); setEmpresaId(current => data.some(item => item.id === current) ? current : data[0]?.id || '') } catch (e) { setError(e.message) } }
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); if (!nextSession) { setEmpresas([]); setEmpresaId('') } })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (session) loadEmpresas() }, [session?.user.id])
  if (!supabase) return <main><div className="alert error">{supabaseConfigError}</div></main>
  if (authLoading) return <main><p>Cargando sesión…</p></main>
  if (!session) return <AuthPanel />
  if (error) return <main><div className="alert error">{error}</div><button onClick={loadEmpresas}>Reintentar</button></main>
  if (!empresaId) return <EmpresaSetup user={session.user} onReady={loadEmpresas} />
  const empresa = empresas.find(item => item.id === empresaId)
  return <Dashboard user={session.user} empresa={empresa} empresas={empresas} onEmpresaChange={setEmpresaId} onLogout={() => supabase.auth.signOut()} />
}
