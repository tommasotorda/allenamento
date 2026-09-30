import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui'
import type { Pendente } from './registro'

/**
 * Riepilogo di fine seduta: cio' che non e' stato confermato, gia' compilato con i valori
 * precompilati. Si toglie la spunta a cio' che non si e' fatto e si registra tutto in un tap.
 */
export function FineSeduta({ voci, onChiudi, onTermina }: { voci: [string, Pendente][]; onChiudi: () => void; onTermina: () => Promise<void> }) {
  const [scelte, setScelte] = useState(() => new Set(voci.map(([k]) => k)))
  const [salvo, setSalvo] = useState(false)
  useEffect(() => {
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prima
    }
  }, [])

  const registra = async () => {
    setSalvo(true)
    try {
      for (const [k, p] of voci) if (scelte.has(k)) await p.salva()
      await onTermina()
    } finally {
      setSalvo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" role="dialog" aria-modal="true" aria-label="Completa il logbook">
      <div className="pb-safe max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-zinc-50 p-4 dark:bg-zinc-950 md:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold">Completa il logbook</h2>
          <button type="button" onClick={onChiudi} className="flex size-10 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800" aria-label="Chiudi">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <p className="mb-3 text-sm text-zinc-500">Da registrare con i valori precompilati</p>
        <div className="space-y-2">
          {voci.map(([k, p]) => {
            const on = scelte.has(k)
            return (
              <button
                key={k}
                type="button"
                onClick={() => setScelte((s) => {
                  const n = new Set(s)
                  if (n.has(k)) n.delete(k)
                  else n.add(k)
                  return n
                })}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ${on ? 'bg-white ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10' : 'bg-transparent opacity-60 ring-zinc-900/5 dark:ring-white/5'}`}
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${on ? 'bg-accent text-white' : 'ring-2 ring-zinc-300 dark:ring-zinc-700'}`}>{on && <Icon name="check" className="size-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.titolo}</span>
                  <span className="block truncate text-sm text-zinc-500">{p.dettaglio}</span>
                </span>
              </button>
            )
          })}
        </div>
        <Button variant="primary" big className="mt-4 w-full" disabled={salvo} onClick={registra}>
          {scelte.size ? `Registra ${scelte.size} e termina` : 'Termina'}
        </Button>
        <Button variant="ghost" className="mt-1 w-full" disabled={salvo} onClick={() => void onTermina()}>
          Termina senza registrarli
        </Button>
      </div>
    </div>
  )
}
