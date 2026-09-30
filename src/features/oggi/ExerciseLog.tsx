import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useRestTimer } from '../../components/RestTimer'
import { Badge, Card, ExerciseThumb } from '../../components/ui'
import { eliminaSerie, salvaSerie, serieUltimaSeduta, uuid } from '../../db/repositories'
import { esercizio } from '../../domain/data'
import { caricoSuggerito, primoNumero, ripetizioniEffettive, serieEffettive, testoPrescrizione } from '../../domain/progression'
import type { Fase, Prescrizione, Serie } from '../../domain/types'
import { SetRow, type Bozza } from './SetRow'
import { LinkEsercizio, type Lista } from '../esercizi/lista'

interface Props {
  sedutaId: string
  data: string
  p: Prescrizione
  fase: Fase
  incrementoKg: number
  serie: Serie[]
  lista?: Lista
  pos?: number
}

/** Blocco di un esercizio nella seduta in corso: intestazione e righe delle serie. */
export function ExerciseLog({ sedutaId, data, p, fase, incrementoKg, serie, lista, pos }: Props) {
  // l'alternativa e' scelta se ci sono gia' serie registrate con quell'esercizio
  const [usaAlt, setUsaAlt] = useState(() => !!p.alternativa && serie.some((s) => s.esercizioId === p.alternativa))
  const id = usaAlt && p.alternativa ? p.alternativa : p.esercizioId
  const es = esercizio(id)
  const mie = serie.filter((s) => s.esercizioId === id)
  const precedenti = useLiveQuery(() => serieUltimaSeduta(id, sedutaId), [id, sedutaId]) ?? []
  const timer = useRestTimer()

  const nSerie = p.serie ? serieEffettive(p.serie, fase, es) : 1
  const righe: { numero: number; lato: 'sx' | null; etichetta: string }[] = []
  for (let i = 1; i <= nSerie; i++) righe.push({ numero: i, lato: null, etichetta: `${i}` })
  for (let k = 1; k <= (p.serieExtraSx ?? 0); k++) righe.push({ numero: nSerie + k, lato: 'sx', etichetta: `${nSerie + k} sx` })

  const suggerito = caricoSuggerito(precedenti, incrementoKg)
  const repsPrescritte = ripetizioniEffettive(p, fase)
  const conRpe = es.categoria !== 'mobilita'

  const iniziale = (numero: number): Bozza => {
    const prec = precedenti.find((s) => s.numero === numero) ?? precedenti.at(-1)
    return {
      caricoKg: suggerito ?? prec?.caricoKg ?? null,
      ripetizioni: prec?.ripetizioni ?? (repsPrescritte?.startsWith('max') ? null : primoNumero(repsPrescritte)),
      durataSec: prec?.durataSec ?? primoNumero(p.durataSec),
      distanzaM: prec?.distanzaM ?? p.distanzaM ?? null,
      rpe: null,
    }
  }

  const fatte = righe.filter((r) => mie.some((s) => s.numero === r.numero)).length

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <LinkEsercizio id={id} lista={lista} pos={pos} className="shrink-0">
          <ExerciseThumb id={id} className="size-16" />
        </LinkEsercizio>
        <div className="min-w-0 flex-1">
          <LinkEsercizio id={id} lista={lista} pos={pos} className="block truncate font-semibold">
            {es.nome}
          </LinkEsercizio>
          <div className="text-sm text-zinc-500">{testoPrescrizione(p, fase, es)}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.recuperoSec ? <Badge>rec {p.recuperoSec} s</Badge> : null}
            {p.superserieCon && <Badge tone="blue">superserie: {esercizio(p.superserieCon).nome}</Badge>}
            {fatte > 0 && (
              <Badge tone={fatte >= righe.length ? 'green' : 'zinc'}>
                {fatte}/{righe.length}
              </Badge>
            )}
          </div>
        </div>
        {p.alternativa && (
          <button type="button" onClick={() => setUsaAlt((x) => !x)} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 active:bg-zinc-200 dark:bg-zinc-800" aria-label={`Alterna con ${esercizio(usaAlt ? p.esercizioId : p.alternativa).nome}`} title={esercizio(usaAlt ? p.esercizioId : p.alternativa).nome}>
            <Icon name="swap" className="size-5" />
          </button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {righe.map((r) => {
          const salvata = mie.find((s) => s.numero === r.numero)
          return (
            <SetRow
              key={`${id}-${r.numero}`}
              etichetta={r.etichetta}
              tipo={es.tipoRegistrazione}
              iniziale={iniziale(r.numero)}
              salvata={salvata}
              incrementoKg={incrementoKg}
              conRpe={conRpe}
              onConferma={async (b) => {
                await salvaSerie({ id: salvata?.id ?? uuid(), sedutaId, esercizioId: id, data, numero: r.numero, lato: r.lato, ...b })
                if (!salvata && p.recuperoSec) timer.avvia(p.recuperoSec, es.nome)
              }}
              onElimina={salvata ? () => eliminaSerie(salvata.id) : undefined}
            />
          )
        })}
      </div>
    </Card>
  )
}
