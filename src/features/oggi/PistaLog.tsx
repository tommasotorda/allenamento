import { Stepper } from '../../components/Stepper'
import { Badge, Card, ExerciseThumb } from '../../components/ui'
import { aggiornaSeduta } from '../../db/repositories'
import { esercizio } from '../../domain/data'
import type { StrutturaSeduta } from '../../domain/session'
import type { SedutaLog } from '../../domain/types'
import { LinkEsercizio, type Lista } from '../esercizi/lista'

export function PistaLog({ seduta, pista, lista, pos }: { seduta: SedutaLog; pista: NonNullable<StrutturaSeduta['pista']>; lista?: Lista; pos?: number }) {
  const es = esercizio(pista.esercizioId)
  const set = (k: keyof SedutaLog['pista']) => (v: number | null) => aggiornaSeduta(seduta.id, { pista: { ...seduta.pista, [k]: v } })

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
  return (
    <Card className="flex items-center justify-between p-3">
      <div>
        <div className="font-semibold">Tennis</div>
        <div className="text-sm text-zinc-500">{durataMin} min</div>
      </div>
      <Stepper label="minuti" value={seduta.tennisMin} onChange={(v) => aggiornaSeduta(seduta.id, { tennisMin: v })} step={5} start={durataMin} />
    </Card>
  )
}
