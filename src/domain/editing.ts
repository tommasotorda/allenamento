/**
 * Scheda personalizzata: l'utente puo' aggiungere, togliere, sostituire e riordinare esercizi
 * e cambiare serie, ripetizioni, tempi e recuperi. Si salvano solo i blocchi modificati;
 * il resto viene dal programma originale.
 */
import { esercizi, esercizio } from './data'
import { espandi, MUSCOLI, somiglianza, type MuscoloId } from './muscles'
import type { Esercizio, Piano, Prescrizione, Programma, Seduta, VocePalestra } from './types'
import { clona } from './util'

/** Blocchi modificabili: liste di esercizi di una seduta o una variante del core. */
export type Blocco = { tipo: 'palestra' | 'mobilita'; sedutaId: string } | { tipo: 'core'; variante: 'A' | 'B' }

export function vociBlocco(p: Programma, b: Blocco): VocePalestra[] {
  if (b.tipo === 'core') return b.variante === 'A' ? p.blocco_core.varianteA : p.blocco_core.varianteB
  const s = p.sedute[b.sedutaId]
  if (!s) return []
  return (b.tipo === 'palestra' ? s.palestra : s.mobilita) ?? []
}

/** Programma con il blocco sostituito da `voci`. */
export function conVoci(p: Programma, b: Blocco, voci: VocePalestra[]): Programma {
  if (b.tipo === 'core') {
    const bc = { ...p.blocco_core, [b.variante === 'A' ? 'varianteA' : 'varianteB']: voci as Prescrizione[] }
    return { ...p, blocco_core: bc }
  }
  const s: Seduta = { ...p.sedute[b.sedutaId], [b.tipo]: voci }
  return { ...p, sedute: { ...p.sedute, [b.sedutaId]: s } }
}

export function bloccoModificato(piano: Piano, b: Blocco): boolean {
  return JSON.stringify(vociBlocco(piano.programma, b)) !== JSON.stringify(vociBlocco(piano.originale, b))
}

export function ripristinaBlocco(piano: Piano, b: Blocco): Programma {
  return conVoci(piano.programma, b, clona(vociBlocco(piano.originale, b)))
}

// ---------- prescrizioni ----------

/** Prescrizione di partenza per un esercizio aggiunto. */
export function prescrizioneDefault(es: Esercizio): Prescrizione {
  switch (es.tipoRegistrazione) {
    case 'carico_ripetizioni':
      return { esercizioId: es.id, serie: 3, ripetizioni: '8', recuperoSec: 90 }
    case 'ripetizioni':
      return { esercizioId: es.id, serie: 3, ripetizioni: '10', recuperoSec: 60 }
    case 'tempo':
      return { esercizioId: es.id, serie: 3, durataSec: 30, recuperoSec: 30 }
    case 'distanza':
      return { esercizioId: es.id, serie: 3, distanzaM: 20, recuperoSec: 60 }
    case 'pista':
      return { esercizioId: es.id, serie: 1, durataSec: 1200 }
  }
}

/** Sostituisce l'esercizio mantenendo serie e recupero e adattando le misure al nuovo tipo. */
export function sostituisci(p: Prescrizione, nuovo: Esercizio): Prescrizione {
  const def = prescrizioneDefault(nuovo)
  const vecchio = esercizio(p.esercizioId)
  const stessoTipo = vecchio.tipoRegistrazione === nuovo.tipoRegistrazione
  const out: Prescrizione = { ...def, esercizioId: nuovo.id, serie: p.serie ?? def.serie, recuperoSec: p.recuperoSec ?? def.recuperoSec }
  if (stessoTipo) {
    if (p.ripetizioni) out.ripetizioni = p.ripetizioni
    if (p.durataSec !== undefined) out.durataSec = p.durataSec
    if (p.distanzaM !== undefined) out.distanzaM = p.distanzaM
    if (p.rpe) out.rpe = p.rpe
  }
  return out
}

/** "3-5" -> {min:3,max:5,resto:''}; "8 per lato" -> {min:8,max:8,resto:' per lato'}; testi liberi -> null */
export function leggiIntervallo(s: string | number | undefined): { min: number; max: number; resto: string } | null {
  if (s === undefined) return null
  if (typeof s === 'number') return { min: s, max: s, resto: '' }
  const m = s.match(/^\s*(\d+)(?:\s*-\s*(\d+))?(.*)$/)
  if (!m) return null
  const min = Number(m[1])
  return { min, max: m[2] ? Number(m[2]) : min, resto: m[3] }
}

export function scriviIntervallo(min: number, max: number, resto: string): string {
  const hi = Math.max(min, max)
  return `${min}${hi > min ? `-${hi}` : ''}${resto}`
}

// ---------- suggerimenti di sostituzione ----------

export interface Suggerimento {
  es: Esercizio
  punteggio: number
  comuni: MuscoloId[]
}

/**
 * Esercizi affini per coinvolgimento muscolare (somiglianza coseno), con un piccolo bonus
 * per stessa categoria e stesso modo di registrazione.
 */
/** Gli esercizi si sostituiscono dentro lo stesso gruppo: allenamento, recupero (mobilita', stretching, yoga), pista. */
const gruppo = (e: Esercizio) => (e.categoria === 'pista' ? 'pista' : ['mobilita', 'stretching', 'yoga'].includes(e.categoria) ? 'recupero' : 'allenamento')

export function suggerisciSostituti(id: string, esclusi: string[] = [], n = 6): Suggerimento[] {
  const orig = esercizio(id)
  const mo = espandi(orig.muscoli)
  return esercizi
    .filter((e) => e.id !== id && !esclusi.includes(e.id) && gruppo(e) === gruppo(orig))
    .map((e) => {
      const me = espandi(e.muscoli)
      const cos = somiglianza(mo, me)
      const punteggio = 0.8 * cos + 0.1 * Number(e.categoria === orig.categoria) + 0.1 * Number(e.tipoRegistrazione === orig.tipoRegistrazione)
      const comuni = (Object.keys(MUSCOLI) as MuscoloId[]).filter((m) => (mo[m] ?? 0) >= 2 && (me[m] ?? 0) >= 2)
      return { es: e, punteggio, comuni }
    })
    .filter((s) => s.punteggio > 0.25)
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, n)
}
