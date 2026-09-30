import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useRestTimer } from '../../components/RestTimer'
import { Badge, Button, Card, ExerciseThumb, numIt } from '../../components/ui'
import { azzeraMemoria, chiaveEs, eliminaSerie, salvaSerieRicordando, serieUltimaSeduta, uuid } from '../../db/repositories'
import { db } from '../../db/schema'
import { esercizio } from '../../domain/data'
import { caricoSuggerito, serieEffettive, testoPrescrizione, valoriPrecompilati } from '../../domain/progression'
import type { Fase, Prescrizione, Serie } from '../../domain/types'
import { riassunto, SetRow, type Bozza } from './SetRow'
import { usePendente } from './registro'
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
  /** etichetta nella superserie (A1, A2...) */
  superserie?: string
}

/** Blocco di un esercizio nella seduta in corso: intestazione e righe delle serie. */
export function ExerciseLog({ sedutaId, data, p, fase, incrementoKg, serie, lista, pos, superserie }: Props) {
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

  // precompilazione: memoria dell'utente, poi ultima seduta, poi scheda
  const memoria = useLiveQuery(() => db.memoria.get(chiaveEs(id)), [id])
  const [caricoApplicato, setCaricoApplicato] = useState<number | null>(null)
  const [confermaReset, setConfermaReset] = useState(false)
  const suggerito = caricoSuggerito(precedenti, incrementoKg)
  const conRpe = es.categoria !== 'mobilita'
  const iniziale = (numero: number): Bozza => valoriPrecompilati(numero, { memoria, precedenti, p, fase, caricoApplicato })

  // valori attuali delle righe non confermate (anche se modificate a mano)
  const bozze = useRef(new Map<number, Bozza>())
  const daRegistrare = righe.filter((r) => !mie.some((s) => s.numero === r.numero))
  const registraTutte = async () => {
    for (const r of daRegistrare) {
      const b = bozze.current.get(r.numero) ?? iniziale(r.numero)
      await salvaSerieRicordando({ id: uuid(), sedutaId, esercizioId: id, data, numero: r.numero, lato: r.lato, ...b })
    }
  }
  const primaBozza = daRegistrare.length ? (bozze.current.get(daRegistrare[0].numero) ?? iniziale(daRegistrare[0].numero)) : null
  usePendente(
    `es:${p.esercizioId}`,
    primaBozza
      ? { titolo: es.nome, dettaglio: `${daRegistrare.length} ${daRegistrare.length === 1 ? 'serie' : 'serie'} · ${riassunto(es.tipoRegistrazione, primaBozza)}`, salva: registraTutte }
      : null,
  )
  const caricoAttuale = primaBozza?.caricoKg ?? null
  const mostraSuggerito = es.tipoRegistrazione === 'carico_ripetizioni' && suggerito !== null && caricoAttuale !== null && suggerito > caricoAttuale && !!daRegistrare.length

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
            {superserie && <Badge tone="blue">Superserie {superserie}</Badge>}
            {p.recuperoSec ? <Badge>rec {p.recuperoSec} s</Badge> : superserie ? <Badge>subito il successivo</Badge> : null}
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
                await salvaSerieRicordando({ id: salvata?.id ?? uuid(), sedutaId, esercizioId: id, data, numero: r.numero, lato: r.lato, ...b })
                if (!salvata && p.recuperoSec) timer.avvia(p.recuperoSec, es.nome)
              }}
              onElimina={salvata ? () => eliminaSerie(salvata.id) : undefined}
              onBozza={(b) => bozze.current.set(r.numero, b)}
            />
          )
        })}
      </div>
      {(daRegistrare.length > 0 || mostraSuggerito) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {daRegistrare.length > 1 && (
            <Button className="h-10 flex-1" onClick={registraTutte}>
              <Icon name="checks" className="size-5" /> Conferma tutte ({daRegistrare.length})
            </Button>
          )}
          {mostraSuggerito && (
            <Button className="h-10" variant="ghost" onClick={() => setCaricoApplicato(suggerito)}>
              Suggerito {numIt(suggerito!, 2)} kg
            </Button>
          )}
        </div>
      )}
      <div className="mt-2 flex justify-end">
        {confermaReset ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Ripartire dai valori della scheda?</span>
            <Button
              className="h-8 px-3 text-xs"
              variant="danger"
              onClick={async () => {
                await azzeraMemoria(id)
                bozze.current.clear()
                setCaricoApplicato(null)
                setConfermaReset(false)
              }}
            >
              Azzera
            </Button>
            <Button className="h-8 px-3 text-xs" onClick={() => setConfermaReset(false)}>
              No
            </Button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfermaReset(true)} className="flex items-center gap-1 text-xs font-medium text-zinc-400" aria-label="Azzera i valori precompilati">
            <Icon name="reset" className="size-3.5" /> {memoria?.azzerata ? 'valori della scheda' : 'valori precompilati'}
          </button>
        )}
      </div>
    </Card>
  )
}
