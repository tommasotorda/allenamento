import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card } from '../../components/ui'
import { aggiornaProgramma } from '../../db/repositories'
import { db } from '../../db/schema'
import { esercizio } from '../../domain/data'
import { conVoci, sostituisci, vociBlocco } from '../../domain/editing'
import { testoPrescrizione } from '../../domain/progression'
import { isCircuito, type Esercizio, type VocePalestra } from '../../domain/types'
import { useCiclo } from '../../hooks'
import { ExercisePicker } from '../scheda/ExercisePicker'
import { PrescrizioneForm } from '../scheda/BlockEditor'
import type { StatoLista, VoceLista } from './lista'

interface Props {
  stato: StatoLista
  /** nuova lista dopo una modifica e posizione da mostrare (null = lista finita, si torna indietro) */
  onLista: (voci: VoceLista[], pos: number | null) => void
}

/** Modifica della voce della scheda da cui si e' aperto l'esercizio: specifiche, sostituzione, rimozione. */
export function ModificaNellaScheda({ stato, onLista }: Props) {
  const voce = stato.voci[stato.pos]
  const piano = useLiveQuery(() => (stato.pianoId ? db.piani.get(stato.pianoId) : undefined), [stato.pianoId])
  const c = useCiclo()
  const [modifica, setModifica] = useState(false)
  const [scegli, setScegli] = useState(false)
  const [conferma, setConferma] = useState(false)
  if (!piano || !voce?.blocco || voce.indice === undefined) return null

  const blocco = voce.blocco
  const voci = vociBlocco(piano.programma, blocco)
  // l'indice salvato puo' essere cambiato (modifiche da altre schermate): si riallinea sull'esercizio
  const combacia = (v: VocePalestra | undefined) => !!v && (isCircuito(v) ? v.esercizi[voce.sub ?? -1] === voce.id : v.esercizioId === voce.id)
  const idx = combacia(voci[voce.indice]) ? voce.indice : voci.findIndex(combacia)
  if (idx < 0) return null
  const v = voci[idx]
  const fase = c && c.piano.id === piano.id ? c.fase : piano.programma.fasi[0]
  const salva = (nuove: VocePalestra[]) => aggiornaProgramma(piano.id, conVoci(piano.programma, blocco, nuove))
  const nomeBlocco = blocco.tipo === 'core' ? `Core · variante ${blocco.variante}` : `${piano.programma.sedute[blocco.sedutaId]?.nome ?? ''} · ${{ palestra: 'palestra', mobilita: 'mobilità', riscaldamento: 'riscaldamento' }[blocco.tipo]}`

  const sostituisciCon = async (es: Esercizio) => {
    setScegli(false)
    const nuova = isCircuito(v) ? { ...v, esercizi: v.esercizi.map((id, k) => (k === voce.sub ? es.id : id)) } : sostituisci(v, es)
    await salva(voci.map((x, k) => (k === idx ? nuova : x)))
    onLista(
      stato.voci.map((x, k) => (k === stato.pos ? { ...x, id: es.id, indice: idx } : x)),
      stato.pos,
    )
  }

  const rimuovi = async () => {
    setConferma(false)
    const svuotaCircuito = isCircuito(v) && v.esercizi.length <= 1
    const nuove = isCircuito(v) && !svuotaCircuito ? voci.map((x, k) => (k === idx ? { ...v, esercizi: v.esercizi.filter((_, j) => j !== voce.sub) } : x)) : voci.filter((_, k) => k !== idx)
    await salva(nuove)
    // le voci successive dello stesso blocco scalano di una posizione
    const stessoBlocco = (x: VoceLista) => JSON.stringify(x.blocco) === JSON.stringify(blocco)
    const tolta = !isCircuito(v) || svuotaCircuito
    const resto = stato.voci
      .filter((_, k) => k !== stato.pos)
      .map((x) => {
        if (!stessoBlocco(x) || x.indice === undefined) return x
        if (tolta && x.indice > idx) return { ...x, indice: x.indice - 1 }
        if (!tolta && x.indice === idx && x.sub !== undefined && voce.sub !== undefined && x.sub > voce.sub) return { ...x, sub: x.sub - 1 }
        return x
      })
    onLista(resto, resto.length ? Math.min(stato.pos, resto.length - 1) : null)
  }

  const es = esercizio(voce.id)
  const presenti = voci.flatMap((x) => (isCircuito(x) ? x.esercizi : [x.esercizioId]))

  return (
    <Card className="mt-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nella scheda</div>
          <div className="truncate text-sm text-zinc-500">
            {piano.nome} · {nomeBlocco}
          </div>
          <div className="mt-1 text-lg font-semibold">{isCircuito(v) ? `Circuito · ${v.giri} giri · ${v.lavoroSec} s / ${v.pausaSec} s` : testoPrescrizione(v, fase, es)}</div>
          {!isCircuito(v) && v.recuperoSec ? <Badge>recupero {v.recuperoSec} s</Badge> : null}
        </div>
        {!isCircuito(v) && (
          <Button className="h-9 shrink-0 px-3 text-sm" variant={modifica ? 'primary' : 'secondary'} onClick={() => setModifica((m) => !m)}>
            {modifica ? 'Fine' : 'Modifica'}
          </Button>
        )}
      </div>
      {modifica && !isCircuito(v) && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <PrescrizioneForm p={v} onChange={(n) => salva(voci.map((x, k) => (k === idx ? n : x)))} />
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button className="h-10 flex-1" onClick={() => setScegli(true)}>
          <Icon name="swap" className="size-5" /> Sostituisci
        </Button>
        {conferma ? (
          <>
            <Button variant="danger" className="h-10" onClick={rimuovi}>
              Rimuovi
            </Button>
            <Button className="h-10" onClick={() => setConferma(false)}>
              No
            </Button>
          </>
        ) : (
          <Button className="h-10 text-red-600" onClick={() => setConferma(true)} aria-label="Rimuovi dalla scheda">
            <Icon name="trash" className="size-5" />
          </Button>
        )}
      </div>
      {scegli && <ExercisePicker titolo={`Sostituisci ${es.nome}`} sostituisci={voce.id} esclusi={presenti} onScegli={sostituisciCon} onChiudi={() => setScegli(false)} />}
    </Card>
  )
}
