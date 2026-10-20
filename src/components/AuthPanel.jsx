import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPanel() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false), [message, setMessage] = useState('')
  async function submit(event) {
    event.preventDefault(); setMessage('')
    if (password.length < 8) return setMessage('La contraseña debe tener al menos 8 caracteres.')
    setLoading(true)
    const { error, data } = await (mode === 'login' ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password }))
    setLoading(false)
    if (error) return setMessage(error.message)
    setMessage(mode === 'login' ? 'Sesión iniciada.' : data.session ? 'Cuenta creada.' : 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.')
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">orquestAI</p><h1>Facturas de tu PyME</h1><p className="muted">Accede a los datos de tu empresa.</p><form onSubmit={submit}><label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength="8" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{message && <p className="alert">{message}</p>}<button disabled={loading}>{loading ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button></form><button className="link-button" onClick={() => { setMode(current => current === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}</button></section></main>
}
