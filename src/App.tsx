import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Icon, type IconName } from './components/Icon'
import { RestTimerProvider } from './components/RestTimer'
import { EsercizioPage } from './features/esercizi/EsercizioPage'
import { EserciziPage } from './features/esercizi/EserciziPage'
import { ImpostazioniPage } from './features/impostazioni/ImpostazioniPage'
import { OggiPage } from './features/oggi/OggiPage'
import { SedutaStoricoPage } from './features/progressi/SedutaStoricoPage'
import { SchedaPage } from './features/scheda/SchedaPage'
import { SedutaDettaglioPage } from './features/scheda/SedutaDettaglioPage'
import { lazy, Suspense, useEffect } from 'react'

// i grafici (Recharts) sono pesanti: caricati solo aprendo Progressi
const ProgressiPage = lazy(() => import('./features/progressi/ProgressiPage').then((m) => ({ default: m.ProgressiPage })))

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Oggi', icon: 'play' },
  { to: '/scheda', label: 'Scheda', icon: 'calendar' },
  { to: '/progressi', label: 'Progressi', icon: 'chart' },
  { to: '/esercizi', label: 'Esercizi', icon: 'book' },
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function Nav() {
  const base = 'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-base'
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:p-3 md:pt-6">
      <div className="hidden px-3 pb-6 text-xl font-bold md:block">Allenamento</div>
      <div className="flex h-16 md:h-auto md:flex-col md:gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `${base} ${isActive ? 'text-accent md:bg-accent/10' : 'text-zinc-500 md:text-zinc-700 md:dark:text-zinc-300'}`}
          >
            <Icon name={n.icon} className="size-6" />
            {n.label}
          </NavLink>
        ))}
        <NavLink
          to="/impostazioni"
          className={({ isActive }) => `${base} hidden md:flex ${isActive ? 'text-accent md:bg-accent/10' : 'text-zinc-500 md:text-zinc-700 md:dark:text-zinc-300'}`}
        >
          <Icon name="gear" className="size-6" />
          Impostazioni
        </NavLink>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <RestTimerProvider>
        <ScrollTop />
        <div className="pt-safe md:pl-56">
          <main className="mx-auto max-w-2xl px-4 pb-40 md:pb-16 md:pt-4">
            <Routes>
              <Route path="/" element={<OggiPage />} />
              <Route path="/scheda" element={<SchedaPage />} />
              <Route path="/scheda/:giorno" element={<SedutaDettaglioPage />} />
              <Route path="/progressi" element={<Suspense fallback={null}><ProgressiPage /></Suspense>} />
              <Route path="/progressi/seduta/:id" element={<SedutaStoricoPage />} />
              <Route path="/esercizi" element={<EserciziPage />} />
              <Route path="/esercizi/:id" element={<EsercizioPage />} />
              <Route path="/impostazioni" element={<ImpostazioniPage />} />
            </Routes>
          </main>
        </div>
        <Nav />
      </RestTimerProvider>
    </HashRouter>
  )
}
