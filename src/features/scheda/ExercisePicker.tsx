import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Chip, ExerciseThumb } from '../../components/ui'
import { CATEGORIE, esercizi, esercizio, NOMI_CATEGORIE } from '../../domain/data'
import { suggerisciSostituti } from '../../domain/editing'
import { MUSCOLI } from '../../domain/muscles'
import type { Categoria, Esercizio } from '../../domain/types'

interface Props {
  titolo: string
  /** esercizio da sostituire: mostra i suggerimenti affini */
  sostituisci?: string
  /** gia' presenti nel blocco */
  esclusi: string[]
  onScegli: (es: Esercizio) => void
  onChiudi: () => void
}

/** Selettore a schermo intero: suggerimenti per muscoli coinvolti e libreria filtrabile. */
export function ExercisePicker({ titolo, sostituisci, esclusi, onScegli, onChiudi }: Props) {
  const [cat, setCat] = useState<Categoria | null>(sostituisci ? esercizio(sostituisci).categoria : null)
  const suggeriti = sostituisci ? suggerisciSostituti(sostituisci, esclusi) : []
  const lista = esercizi.filter((e) => e.categoria !== 'pista' && (!cat || e.categoria === cat) && e.id !== sostituisci)

  // blocca lo scorrimento della pagina sotto
  useEffect(() => {
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prima
    }
  }, [])

  const riga = (e: Esercizio, extra?: React.ReactNode) => (
    <button key={e.id} type="button" onClick={() => onScegli(e)} disabled={esclusi.includes(e.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-zinc-100 disabled:opacity-40 dark:active:bg-zinc-800">
      <ExerciseThumb id={e.id} className="size-14" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{e.nome}</div>
        <div className="text-xs text-zinc-500">{NOMI_CATEGORIE[e.categoria]}</div>
        {extra}
      </div>
      <Icon name={sostituisci ? 'swap' : 'plus'} className="size-5 shrink-0 text-accent" />
    </button>
  )

  return (
    <div className="pt-safe fixed inset-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950" role="dialog" aria-modal="true" aria-label={titolo}>
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 pb-2 pt-3">
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{titolo}</h2>
        <button type="button" onClick={onChiudi} className="flex size-11 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800" aria-label="Chiudi">
          <Icon name="close" className="size-5" />
        </button>
      </div>
      <div className="pb-safe mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8">
        {suggeriti.length > 0 && (
          <>
            <div className="mb-1 mt-2 px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Affini per muscoli coinvolti</div>
            <div className="rounded-2xl bg-white p-1 ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
              {suggeriti.map((s) =>
                riga(
                  s.es,
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent-strong dark:text-accent">{Math.round(s.punteggio * 100)}%</span>
                    {s.comuni.slice(0, 3).map((m) => (
                      <span key={m} className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        {MUSCOLI[m].nome}
                      </span>
                    ))}
                  </div>,
                ),
              )}
            </div>
          </>
        )}
        <div className="mb-1 mt-5 px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Libreria</div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Chip active={!cat} onClick={() => setCat(null)}>
            Tutti
          </Chip>
          {CATEGORIE.filter((c) => c !== 'pista').map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {NOMI_CATEGORIE[c]}
            </Chip>
          ))}
        </div>
        <div className="rounded-2xl bg-white p-1 ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">{lista.map((e) => riga(e))}</div>
      </div>
    </div>
  )
}
