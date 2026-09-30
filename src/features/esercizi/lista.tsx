/**
 * Lista di esercizi da cui si apre la pagina di un esercizio: permette di scorrere al
 * successivo/precedente e, se la lista viene da una scheda, di modificare la voce.
 * Viaggia nello stato della navigazione (location.state).
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Blocco } from '../../domain/editing'
import type { StrutturaSeduta } from '../../domain/session'
import { isCircuito, type Programma, type VocePalestra } from '../../domain/types'

export interface VoceLista {
  id: string
  /** posizione nella scheda: presente solo se la voce e' modificabile */
  blocco?: Blocco
  indice?: number
  /** esercizio dentro un circuito */
  sub?: number
}

export interface StatoLista {
  titolo: string
  voci: VoceLista[]
  pos: number
  /** piano a cui appartengono le voci modificabili */
  pianoId?: string
  /** direzione dell'ultimo scorrimento, per l'animazione */
  dir?: 1 | -1
}

/** Voci di una seduta nell'ordine in cui compaiono, con il riferimento al blocco del programma. */
export function listaDaSeduta(programma: Programma | undefined, s: StrutturaSeduta): VoceLista[] {
  const out: VoceLista[] = []
  const grezza = programma?.sedute[s.sedutaId]
  if (s.core) s.core.voci.forEach((p, i) => out.push({ id: p.esercizioId, blocco: { tipo: 'core', variante: s.core!.variante }, indice: i }))
  if (s.pista) out.push({ id: s.pista.esercizioId })
  const aggiungi = (voci: VocePalestra[], originali: VocePalestra[] | undefined, tipo: 'palestra' | 'mobilita') => {
    for (const v of voci) {
      // gli sbloccabili attivi non stanno nel blocco: si vedono ma non si modificano da qui
      const i = originali?.indexOf(v) ?? -1
      const blocco = i >= 0 ? ({ tipo, sedutaId: s.sedutaId } as const) : undefined
      if (isCircuito(v)) v.esercizi.forEach((id, k) => out.push({ id, blocco, indice: i >= 0 ? i : undefined, sub: k }))
      else out.push({ id: v.esercizioId, blocco, indice: i >= 0 ? i : undefined })
    }
  }
  aggiungi(s.palestra, grezza?.palestra, 'palestra')
  aggiungi(s.mobilita, grezza?.mobilita, 'mobilita')
  return out
}

export function statoLista(titolo: string, voci: VoceLista[], pos: number, pianoId?: string): StatoLista {
  return { titolo, voci, pos, pianoId }
}

/** Link alla pagina dell'esercizio con la lista di provenienza. */
export function LinkEsercizio({ id, lista, pos, className, children }: { id?: string; lista?: Omit<StatoLista, 'pos'>; pos?: number; className?: string; children: ReactNode }) {
  const conLista = lista && pos !== undefined && lista.voci[pos]
  const dest = id ?? (conLista ? lista.voci[pos].id : undefined)
  if (!dest) return <span className={className}>{children}</span>
  return (
    <Link to={`/esercizi/${dest}`} state={conLista ? ({ ...lista, pos } satisfies StatoLista) : undefined} className={className}>
      {children}
    </Link>
  )
}

export type Lista = Omit<StatoLista, 'pos'>
