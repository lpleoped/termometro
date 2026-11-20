import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './layout.css'

// 👇 Importa Router
import { BrowserRouter as Router } from 'react-router-dom'
// 👇 Importa el provider
import { AuthProvider } from './context/AuthContext'

if (import.meta.env.PROD && !navigator.userAgent.includes('Electron') && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  </StrictMode>,
)