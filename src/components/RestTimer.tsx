import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface TimerCtx {
  avvia: (secondi: number, etichetta?: string) => void
  ferma: () => void
}

const Ctx = createContext<TimerCtx>({ avvia: () => {}, ferma: () => {} })
export const useRestTimer = () => useContext(Ctx)

function bip() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ac = new AC()
    for (const [i, f] of [880, 1320].entries()) {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.25, ac.currentTime + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.18 + 0.16)
      o.connect(g).connect(ac.destination)
      o.start(ac.currentTime + i * 0.18)
      o.stop(ac.currentTime + i * 0.18 + 0.17)
    }
    setTimeout(() => ac.close(), 600)
  } catch {
    /* audio non disponibile */
  }
  navigator.vibrate?.([200, 100, 200])
}

/** Timer di recupero globale: resta visibile cambiando schermata; basato sull'orario di fine. */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [fine, setFine] = useState<number | null>(null)
  const [durata, setDurata] = useState(0)
  const [etichetta, setEtichetta] = useState('')
  const [ora, setOra] = useState(Date.now())
  const suonato = useRef(false)

  const avvia = useCallback((s: number, e = '') => {
    if (s <= 0) return
    suonato.current = false
    setDurata(s)
    setEtichetta(e)
    setFine(Date.now() + s * 1000)
  }, [])
  const ferma = useCallback(() => setFine(null), [])

  useEffect(() => {
    if (fine === null) return
    const id = setInterval(() => setOra(Date.now()), 250)
    return () => clearInterval(id)
  }, [fine])

  const restanti = fine === null ? 0 : Math.max(0, Math.ceil((fine - ora) / 1000))
  useEffect(() => {
    if (fine !== null && restanti === 0 && !suonato.current) {
      suonato.current = true
      bip()
      const t = setTimeout(() => setFine(null), 2500)
      return () => clearTimeout(t)
    }
  }, [restanti, fine])

  return (
    <Ctx.Provider value={{ avvia, ferma }}>
      {children}
      {fine !== null && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:bottom-4 md:left-56">
          <div className={`flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-xl ${restanti === 0 ? 'bg-green-600' : 'bg-zinc-900 dark:bg-zinc-800'}`}>
            <Icon name="timer" className="size-6 shrink-0 opacity-70" />
            <div className="min-w-0 flex-1">
              <div className="text-3xl font-bold tabular-nums leading-none">
                {Math.floor(restanti / 60)}:{String(restanti % 60).padStart(2, '0')}
              </div>
              {etichetta && <div className="truncate text-xs opacity-70">{etichetta}</div>}
              <div className="mt-1.5 h-1 overflow-hidden rounded bg-white/20">
                <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${durata ? (restanti / durata) * 100 : 0}%` }} />
              </div>
            </div>
            <button onClick={() => setFine((f) => (f ?? Date.now()) + 15000)} className="h-11 rounded-xl bg-white/15 px-3 text-sm font-semibold active:bg-white/25">
              +15
            </button>
            <button onClick={ferma} className="flex size-11 items-center justify-center rounded-xl bg-white/15 active:bg-white/25" aria-label="Chiudi timer">
              <Icon name="close" className="size-5" />
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
