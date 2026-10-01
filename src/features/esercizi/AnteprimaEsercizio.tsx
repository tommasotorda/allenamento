import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { MuscleMap } from '../../components/MuscleMap'
import { Badge, Button, Card, SectionTitle } from '../../components/ui'
import { esercizio, NOMI_CATEGORIE } from '../../domain/data'
import { espandi, MUSCOLI, perLivello, type Livello } from '../../domain/muscles'
import type { Esercizio } from '../../domain/types'

// three.js e' pesante: il visore si carica solo aprendo un esercizio
const Viewer3D = lazy(() => import('./Viewer3D'))

const LIVELLI: [Livello, string, string][] = [
  [3, 'Primari', 'bg-[#ff3b30]'],
  [2, 'Secondari', 'bg-[#c0322b]'],
  [1, 'Stabilizzatori', 'bg-[#7a2e29]'],
]

export function Visore({ id }: { id: string }) {
  return (
    <Card className="p-2">
      <Suspense fallback={<div className="aspect-square w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 sm:aspect-[4/3]" />}>
        <Viewer3D id={id} />
      </Suspense>
    </Card>
  )
}

/** Mappa muscolare con l'elenco dei muscoli per livello di coinvolgimento. */
export function MuscoliCoinvolti({ es }: { es: Esercizio }) {
  return (
    <Card>
      <MuscleMap id={es.id} className="mx-auto aspect-[204/204] w-full max-w-sm" />
      <div className="mt-3 space-y-2">
        {LIVELLI.map(([l, nome, colore]) => {
          const ms = perLivello(espandi(es.muscoli), l)
          if (!ms.length) return null
          return (
            <div key={l} className="flex gap-2 text-sm">
              <span className={`mt-1 size-3 shrink-0 rounded-sm ${colore}`} />
              <div>
                <span className="font-semibold">{nome}: </span>
                <span className="text-zinc-600 dark:text-zinc-400">{ms.map((m) => MUSCOLI[m].nome).join(', ')}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function Esecuzione({ es }: { es: Esercizio }) {
  return (
    <Card>
      <ol className="space-y-3">
        {es.esecuzione.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent-strong dark:text-accent">{i + 1}</span>
            <span className="pt-0.5">{p}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

interface Props {
  /** esercizi che si possono scorrere, nell'ordine dell'elenco di provenienza */
  ids: string[]
  pos: number
  onPos: (pos: number) => void
  onChiudi: () => void
  azione: { etichetta: string; icona: IconName; disabilitato: (id: string) => boolean; onClick: (es: Esercizio) => void }
}

/**
 * Anteprima di un esercizio sopra il selettore: visore 3D, muscoli ed esecuzione, con
 * frecce, tastiera e swipe per scorrere l'elenco. Chiudendola il selettore resta com'era.
 */
export function AnteprimaEsercizio({ ids, pos, onPos, onChiudi, azione }: Props) {
  const es = esercizio(ids[pos])
  const [dir, setDir] = useState<1 | -1 | 0>(0)
  const corpo = useRef<HTMLDivElement>(null)
  const vai = (p: number) => {
    if (p < 0 || p >= ids.length || p === pos) return
    setDir(p > pos ? 1 : -1)
    onPos(p)
  }
  // nuovo esercizio: si riparte dall'alto
  useEffect(() => corpo.current?.scrollTo(0, 0), [pos])

  const vaiRef = useRef(vai)
  useEffect(() => {
    vaiRef.current = vai
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onChiudi()
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      e.preventDefault()
      e.stopPropagation()
      vaiRef.current(pos + (e.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [pos, onChiudi])

  const tocco = useRef<{ x: number; y: number; t: number; suCanvas: boolean } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return (tocco.current = null)
    const t = e.touches[0]
    tocco.current = { x: t.clientX, y: t.clientY, t: performance.now(), suCanvas: !!(e.target as HTMLElement).closest('canvas') }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const i = tocco.current
    tocco.current = null
    if (!i) return
    const t = e.changedTouches[0]
    const dx = t.clientX - i.x
    const dy = t.clientY - i.y
    // sul visore 3D il trascinamento ruota la figura: lo scorrimento vale solo se rapido
    const ok = i.suCanvas ? Math.abs(dx) > 110 && Math.abs(dx) > 3 * Math.abs(dy) && performance.now() - i.t < 450 : Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)
    if (ok) vai(pos + (dx < 0 ? 1 : -1))
  }

  const disabilitato = azione.disabilitato(es.id)
  return (
    <div className="pt-safe fixed inset-0 z-[60] flex flex-col bg-zinc-50 dark:bg-zinc-950" role="dialog" aria-modal="true" aria-label={es.nome}>
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 pb-2 pt-3">
        <button type="button" onClick={onChiudi} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800" aria-label="Torna all'elenco">
          <Icon name="back" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">{es.nome}</h2>
          <div className="text-sm text-zinc-500">
            {ids.length > 1 ? `${pos + 1} / ${ids.length} · ` : ''}
            {NOMI_CATEGORIE[es.categoria]}
          </div>
        </div>
        {ids.length > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => vai(pos - 1)} disabled={pos === 0} className="flex size-10 items-center justify-center rounded-xl bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800" aria-label="Esercizio precedente" title="Precedente (←)">
              <Icon name="back" className="size-5" />
            </button>
            <button type="button" onClick={() => vai(pos + 1)} disabled={pos === ids.length - 1} className="flex size-10 items-center justify-center rounded-xl bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800" aria-label="Esercizio successivo" title="Successivo (→)">
              <Icon name="chevron" className="size-5" />
            </button>
          </div>
        )}
      </div>

      <div ref={corpo} className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={es.id} className={dir === 1 ? 'entra-da-destra' : dir === -1 ? 'entra-da-sinistra' : ''}>
          <Visore id={es.id} />
          <SectionTitle>Muscoli coinvolti</SectionTitle>
          <MuscoliCoinvolti es={es} />
          {es.attrezzatura.length > 0 && (
            <>
              <SectionTitle>Attrezzatura</SectionTitle>
              <div className="flex flex-wrap gap-1.5 px-1">
                {es.attrezzatura.map((a) => (
                  <Badge key={a}>{a}</Badge>
                ))}
              </div>
            </>
          )}
          <SectionTitle>Esecuzione</SectionTitle>
          <Esecuzione es={es} />
        </div>
      </div>

      <div className="pb-safe mx-auto w-full max-w-2xl border-t border-zinc-200 px-4 pt-3 pb-3 dark:border-zinc-800">
        <Button variant="primary" big className="w-full" disabled={disabilitato} onClick={() => azione.onClick(es)}>
          <Icon name={azione.icona} className="size-5" /> {disabilitato ? 'Già nel blocco' : azione.etichetta}
        </Button>
      </div>
    </div>
  )
}
