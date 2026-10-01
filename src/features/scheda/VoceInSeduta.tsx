import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card } from '../../components/ui'
import { esercizio } from '../../domain/data'
import { alternaSuperserie } from '../../domain/editing'
import { testoPrescrizione } from '../../domain/progression'
import { etichetteSuperserie } from '../../domain/session'
import { isCircuito, type Fase, type VocePalestra } from '../../domain/types'
import { PrescrizioneForm } from './PrescrizioneForm'

/** Blocco della scheda che si sta modificando dal selettore. */
export interface SedutaInModifica {
  voci: VocePalestra[]
  fase: Fase
  /** le superserie hanno senso solo nel blocco palestra */
  superserie: boolean
  salva: (voci: VocePalestra[]) => Promise<unknown>
}

/** Posizione della voce di un esercizio nel blocco (escluse le voci dei circuiti), o -1. */
export const indiceVoce = (voci: VocePalestra[], id: string) => voci.findIndex((v) => !isCircuito(v) && v.esercizioId === id)

/**
 * Voce gia' presente nel blocco: specifiche, ordine, superserie e rimozione,
 * senza lasciare l'anteprima dell'esercizio.
 */
export function VoceInSeduta({ id, seduta }: { id: string; seduta: SedutaInModifica }) {
  const { voci, salva } = seduta
  const [modifica, setModifica] = useState(false)
  const [conferma, setConferma] = useState(false)
  const i = indiceVoce(voci, id)
  if (i < 0) {
    if (!voci.some((v) => isCircuito(v) && v.esercizi.includes(id))) return null
    return (
      <Card className="mt-3 p-3 text-sm text-zinc-500">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Nella seduta</span> · dentro un circuito
      </Card>
    )
  }
  const v = voci[i]
  if (isCircuito(v)) return null
  const es = esercizio(id)
  const ss = etichetteSuperserie(voci).get(i)?.etichetta
  const sposta = (d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= voci.length) return
    const n = [...voci]
    ;[n[i], n[j]] = [n[j], n[i]]
    return salva(n)
  }
  const puoSuperserie = seduta.superserie && (v.superserie || (voci[i + 1] && !isCircuito(voci[i + 1])))
  const nomeSucc = voci[i + 1] && !isCircuito(voci[i + 1]) ? esercizio((voci[i + 1] as { esercizioId: string }).esercizioId).nome : null

  return (
    <Card className="mt-3 p-3 ring-2 ring-accent/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Nella seduta · {i + 1} di {voci.length}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {ss && <Badge tone="blue">{ss}</Badge>}
            <span className="text-lg font-semibold">{testoPrescrizione(v, seduta.fase, es)}</span>
          </div>
          {v.recuperoSec ? <Badge>recupero {v.recuperoSec} s</Badge> : null}
        </div>
        <Button className="h-9 shrink-0 px-3 text-sm" variant={modifica ? 'primary' : 'secondary'} onClick={() => setModifica((m) => !m)}>
          {modifica ? 'Fine' : 'Modifica'}
        </Button>
      </div>
      {modifica && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <PrescrizioneForm p={v} onChange={(n) => salva(voci.map((x, k) => (k === i ? n : x)))} />
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button className="h-10 flex-1 px-2 text-sm" disabled={i === 0} onClick={() => sposta(-1)} aria-label="Sposta prima">
          <Icon name="back" className="size-5 rotate-90" /> Prima
        </Button>
        <Button className="h-10 flex-1 px-2 text-sm" disabled={i === voci.length - 1} onClick={() => sposta(1)} aria-label="Sposta dopo">
          <Icon name="chevron" className="size-5 rotate-90" /> Dopo
        </Button>
        {conferma ? (
          <>
            <Button variant="danger" className="h-10" onClick={() => salva(voci.filter((_, k) => k !== i))}>
              Rimuovi
            </Button>
            <Button className="h-10" onClick={() => setConferma(false)}>
              No
            </Button>
          </>
        ) : (
          <Button className="h-10 text-red-600" onClick={() => setConferma(true)} aria-label="Rimuovi dalla seduta">
            <Icon name="trash" className="size-5" />
          </Button>
        )}
      </div>
      {puoSuperserie && (
        <Button variant="ghost" className="mt-2 h-10 w-full text-sm" onClick={() => salva(alternaSuperserie(voci, i))}>
          {v.superserie ? 'Sciogli superserie' : `Superserie con ${nomeSucc ?? 'il successivo'}`}
        </Button>
      )}
    </Card>
  )
}
