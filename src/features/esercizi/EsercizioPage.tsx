import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MuscleMap } from '../../components/MuscleMap'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, formatData, PageHeader, SectionTitle } from '../../components/ui'
import { aggiungiFoto, eliminaFoto } from '../../db/repositories'
import { db } from '../../db/schema'
import { esercizi, NOMI_CATEGORIE } from '../../domain/data'
import { espandi, MUSCOLI, perLivello, type Livello } from '../../domain/muscles'
import type { FotoEsercizio } from '../../domain/types'
import { riassunto } from '../oggi/SetRow'
import type { StatoLista, VoceLista } from './lista'
import { ModificaNellaScheda } from './ModificaNellaScheda'

// three.js e' pesante: il visore si carica solo aprendo un esercizio
const Viewer3D = lazy(() => import('./Viewer3D'))

const LIVELLI: [Livello, string, string][] = [
  [3, 'Primari', 'bg-[#ff3b30]'],
  [2, 'Secondari', 'bg-[#c0322b]'],
  [1, 'Stabilizzatori', 'bg-[#7a2e29]'],
]

function FotoThumb({ f }: { f: FotoEsercizio }) {
  const [url, setUrl] = useState<string>()
  const [conferma, setConferma] = useState(false)
  useEffect(() => {
    const u = URL.createObjectURL(f.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [f.blob])
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <button
        type="button"
        onClick={() => (conferma ? eliminaFoto(f.id!) : setConferma(true))}
        onBlur={() => setConferma(false)}
        className={`absolute right-1.5 top-1.5 flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-white ${conferma ? 'bg-red-600' : 'bg-black/50'}`}
        aria-label="Elimina foto"
      >
        <Icon name="trash" className="size-4" />
        {conferma && <span className="text-xs font-semibold">Elimina</span>}
      </button>
    </div>
  )
}

export function EsercizioPage() {
  const { id = '' } = useParams()
  const es = esercizi.find((e) => e.id === id)
  const foto = useLiveQuery(() => db.fotoEsercizi.where('esercizioId').equals(id).reverse().toArray(), [id]) ?? []
  const storico = useLiveQuery(async () => {
    const s = await db.serie.where('esercizioId').equals(id).toArray()
    return s.sort((a, b) => b.data.localeCompare(a.data) || a.numero - b.numero).slice(0, 30)
  }, [id]) ?? []
  const input = useRef<HTMLInputElement>(null)
  const [caricamento, setCaricamento] = useState(false)

  // lista di provenienza: scorrimento al precedente/successivo
  const nav = useNavigate()
  const loc = useLocation()
  const stato = loc.state as StatoLista | null
  const lista = stato && stato.voci[stato.pos]?.id === id ? stato : null
  const vai = (pos: number, voci: VoceLista[] = lista!.voci) => {
    if (!lista || pos < 0 || pos >= voci.length) return
    nav(`/esercizi/${voci[pos].id}`, { replace: true, state: { ...lista, voci, pos, dir: pos >= lista.pos ? 1 : -1 } satisfies StatoLista })
  }
  const tocco = useRef<{ x: number; y: number; t: number; suCanvas: boolean } | null>(null)
  // da tastiera: frecce sinistra/destra per l'esercizio precedente/successivo
  const vaiRef = useRef(vai)
  const posRef = useRef(lista?.pos)
  useEffect(() => {
    vaiRef.current = vai
    posRef.current = lista?.pos
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || posRef.current === undefined) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      if (document.querySelector('[role=dialog]')) return
      e.preventDefault()
      vaiRef.current(posRef.current + (e.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return (tocco.current = null)
    const t = e.touches[0]
    tocco.current = { x: t.clientX, y: t.clientY, t: performance.now(), suCanvas: !!(e.target as HTMLElement).closest('canvas') }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const i = tocco.current
    tocco.current = null
    if (!i || !lista || document.querySelector('[role=dialog]')) return
    const t = e.changedTouches[0]
    const dx = t.clientX - i.x
    const dy = t.clientY - i.y
    const dt = performance.now() - i.t
    // sul visore 3D il trascinamento ruota la figura: lo scorrimento vale solo se rapido
    const ok = i.suCanvas ? Math.abs(dx) > 110 && Math.abs(dx) > 3 * Math.abs(dy) && dt < 450 : Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)
    if (ok) vai(lista.pos + (dx < 0 ? 1 : -1))
  }

  if (!es) return <PageHeader back="/esercizi" title="Esercizio non trovato" />

  const perData = new Map<string, typeof storico>()
  for (const s of storico) perData.set(s.data, [...(perData.get(s.data) ?? []), s])

  const frecce = lista && lista.voci.length > 1 && (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => vai(lista.pos - 1)} disabled={lista.pos === 0} className="flex size-10 items-center justify-center rounded-xl bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800" aria-label="Esercizio precedente" aria-keyshortcuts="ArrowLeft" title="Precedente (←)">
        <Icon name="back" className="size-5" />
      </button>
      <button type="button" onClick={() => vai(lista.pos + 1)} disabled={lista.pos === lista.voci.length - 1} className="flex size-10 items-center justify-center rounded-xl bg-zinc-200 disabled:opacity-30 dark:bg-zinc-800" aria-label="Esercizio successivo" aria-keyshortcuts="ArrowRight" title="Successivo (→)">
        <Icon name="chevron" className="size-5" />
      </button>
    </div>
  )

  return (
    <div key={id} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className={lista?.dir === 1 ? 'entra-da-destra' : lista?.dir === -1 ? 'entra-da-sinistra' : ''}>
      <PageHeader
        back="/esercizi"
        title={es.nome}
        subtitle={lista && lista.voci.length > 1 ? `${lista.pos + 1} / ${lista.voci.length} · ${lista.titolo}` : NOMI_CATEGORIE[es.categoria]}
        right={frecce}
      />
      {lista && lista.voci.length > 1 && lista.voci.length <= 24 && (
        <div className="mb-2 flex justify-center gap-1" aria-hidden="true">
          {lista.voci.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === lista.pos ? 'w-4 bg-accent' : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'}`} />
          ))}
        </div>
      )}

      <Card className="p-2">
        <Suspense fallback={<div className="aspect-square w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 sm:aspect-[4/3]" />}>
          <Viewer3D id={es.id} />
        </Suspense>
      </Card>

      {lista?.pianoId && (
        <ModificaNellaScheda
          key={`${lista.pos}-${id}`}
          stato={lista}
          onLista={(voci, pos) => {
            if (pos === null) nav(-1)
            else nav(`/esercizi/${voci[pos].id}`, { replace: true, state: { ...lista, voci, pos } satisfies StatoLista })
          }}
        />
      )}

      <SectionTitle>Muscoli coinvolti</SectionTitle>
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

      {foto.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {foto.map((f) => (
            <FotoThumb key={f.id} f={f} />
          ))}
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setCaricamento(true)
          try {
            await aggiungiFoto(es.id, file)
          } finally {
            setCaricamento(false)
          }
        }}
      />
      <Button className="mt-3 w-full" onClick={() => input.current?.click()} disabled={caricamento}>
        <Icon name="camera" className="size-5" /> Aggiungi foto
      </Button>

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

      {perData.size > 0 && (
        <>
          <SectionTitle>Storico</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {[...perData.entries()].map(([data, ss]) => (
              <div key={data} className="py-2">
                <div className="text-sm font-semibold text-zinc-500">{formatData(data)}</div>
                <div className="mt-1 space-y-0.5">
                  {ss.map((s) => (
                    <div key={s.id} className="flex gap-3 text-sm tabular-nums">
                      <span className="w-8 text-zinc-500">{s.numero}{s.lato ? ` ${s.lato}` : ''}</span>
                      <span>{riassunto(es.tipoRegistrazione, s)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
