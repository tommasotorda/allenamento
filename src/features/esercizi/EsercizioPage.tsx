import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExerciseFigure } from '../../components/ExerciseFigure'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, formatData, PageHeader, SectionTitle } from '../../components/ui'
import { aggiungiFoto, eliminaFoto } from '../../db/repositories'
import { db } from '../../db/schema'
import { esercizi, NOMI_CATEGORIE } from '../../domain/data'
import type { FotoEsercizio } from '../../domain/types'
import { riassunto } from '../oggi/SetRow'

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

  if (!es) return <PageHeader back="/esercizi" title="Esercizio non trovato" />

  const perData = new Map<string, typeof storico>()
  for (const s of storico) perData.set(s.data, [...(perData.get(s.data) ?? []), s])

  return (
    <div>
      <PageHeader back="/esercizi" title={es.nome} subtitle={NOMI_CATEGORIE[es.categoria]} />

      <Card className="p-2">
        <ExerciseFigure id={es.id} animate className="aspect-[240/196] w-full" />
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
