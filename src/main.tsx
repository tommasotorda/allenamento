import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// aggiornamento automatico del service worker quando esce una nuova versione
registerSW({ immediate: true })

// chiede al browser di non cancellare i dati locali (IndexedDB) quando serve spazio
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
