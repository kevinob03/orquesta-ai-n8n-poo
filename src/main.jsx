import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return <main><div className="alert error"><h1>No se pudo iniciar orquestAI</h1><p>{this.state.error.message}</p><p>Recarga la página. Si persiste, copia este mensaje.</p></div></main>
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>)
