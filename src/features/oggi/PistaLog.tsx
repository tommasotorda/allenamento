import { Stepper } from '../../components/Stepper'
import { Badge, Card, ExerciseThumb } from '../../components/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '../../components/ui'
import { aggiornaSeduta, CHIAVE_TENNIS, chiavePista, ricordaPista, ricordaTennis } from '../../db/repositories'
import { db } from '../../db/schema'
import { usePendente } from './registro'
import { esercizio } from '../../domain/data'
import type { StrutturaSeduta } from '../../domain/session'
import type { SedutaLog } from '../../domain/types'
import { LinkEsercizio, type Lista } from '../esercizi/lista'

export function PistaLog({ seduta, pista, lista, pos }: { seduta: SedutaLog; pista: NonNullable<StrutturaSeduta['pista']>; lista?: Lista; pos?: number }) {
  const es = esercizio(pista.esercizioId)
  const set = (k: keyof SedutaLog['pista']) => async (v: number | null) => {
    const nuova = { ...seduta.pista, [k]: v }
    await aggiornaSeduta(seduta.id, { pista: nuova })
    await ricordaPista(pista.esercizioId, nuova)
  }
  // ultimi valori registrati per questa corsa: si propongono e si registrano a fine seduta
  const memoria = useLiveQuery(() => db.memoria.get(chiavePista(pista.esercizioId)), [pista.esercizioId])
  const vuota = Object.values(seduta.pista).every((v) => v === null)
  const ultima = memoria?.pista
  const descr = ultima ? testoPista(ultima) : ''
  const usaUltima = async () => {
    await aggiornaSeduta(seduta.id, { pista: { ...ultima! } })
  }
  usePendente(`pista:${pista.esercizioId}`, vuota && ultima ? { titolo: es.nome, dettaglio: descr, salva: usaUltima } : null)

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <LinkEsercizio id={es.id} lista={lista} pos={pos}>
          <ExerciseThumb id={es.id} className="size-16" />
        </LinkEsercizio>
        <div className="min-w-0 flex-1">
          <LinkEsercizio id={es.id} lista={lista} pos={pos} className="font-semibold">
            {pista.scarico ? 'Corsa in Zona 2' : es.nome}
          </LinkEsercizio>
          {pista.ripetute !== null && (
            <div className="mt-1">
              <Badge tone="accent">{pista.ripetute} ripetute</Badge>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{pista.testo}</p>
      {vuota && ultima && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
          <span className="text-zinc-500">Ultima volta: {descr}</span>
          <Button className="h-9 px-3 text-sm" onClick={usaUltima}>
            Usa
          </Button>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-y-3">
        <Stepper label="durata" unit="min" value={seduta.pista.durataMin} onChange={set('durataMin')} step={1} start={30} />
        <Stepper label="distanza" unit="m" value={seduta.pista.distanzaM} onChange={set('distanzaM')} step={100} start={3000} max={50000} />
        <Stepper label="FC media" unit="bpm" value={seduta.pista.fcMedia} onChange={set('fcMedia')} step={1} start={140} max={220} />
        <Stepper label="ripetute" value={seduta.pista.ripetuteFatte} onChange={set('ripetuteFatte')} step={1} start={pista.ripetute ?? 8} max={50} />
      </div>
    </Card>
  )
}

export function TennisLog({ seduta, durataMin }: { seduta: SedutaLog; durataMin: number }) {
  const memoria = useLiveQuery(() => db.memoria.get(CHIAVE_TENNIS))
  const proposta = memoria?.minuti ?? durataMin
  usePendente('tennis', seduta.tennisMin === null ? { titolo: 'Tennis', dettaglio: `${proposta} min`, salva: () => aggiornaSeduta(seduta.id, { tennisMin: proposta }).then(() => undefined) } : null)
  return (
    <Card className="flex items-center justify-between p-3">
      <div>
        <div className="font-semibold">Tennis</div>
        <div className="text-sm text-zinc-500">{durataMin} min</div>
      </div>
      <Stepper label="minuti" value={seduta.tennisMin} onChange={async (v) => { await aggiornaSeduta(seduta.id, { tennisMin: v }); if (v !== null) await ricordaTennis(v) }} step={5} start={proposta} />
    </Card>
  )
}

function testoPista(p: SedutaLog['pista']): string {
  return [p.durataMin !== null && `${p.durataMin} min`, p.distanzaM !== null && `${p.distanzaM} m`, p.fcMedia !== null && `${p.fcMedia} bpm`, p.ripetuteFatte !== null && `${p.ripetuteFatte} ripetute`].filter(Boolean).join(' · ')
}
