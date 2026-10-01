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
export type Blocco = { tipo: 'palestra' | 'mobilita' | 'riscaldamento'; sedutaId: string } | { tipo: 'core'; variante: 'A' | 'B' }

export function vociBlocco(p: Programma, b: Blocco): VocePalestra[] {
  if (b.tipo === 'core') return b.variante === 'A' ? p.blocco_core.varianteA : p.blocco_core.varianteB
  const s = p.sedute[b.sedutaId]
  if (!s) return []
  return (b.tipo === 'palestra' ? s.palestra : b.tipo === 'mobilita' ? s.mobilita : s.riscaldamento) ?? []
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

/** Unisce in superserie la voce i con la successiva, oppure scioglie la superserie di cui fa parte. */
export function alternaSuperserie(voci: VocePalestra[], i: number): VocePalestra[] {
  const v = voci[i]
  if (!v || 'circuito' in v) return voci
  if (v.superserie) {
    const g = v.superserie
    const membri = voci.filter((x): x is Prescrizione => !('circuito' in x) && x.superserie === g)
    const recupero = Math.max(0, ...membri.map((x) => x.recuperoSec ?? 0))
    // sciolta la coppia, chi non aveva recupero riprende quello del gruppo
    return voci.map((x) => ('circuito' in x || x.superserie !== g ? x : { ...x, superserie: undefined, recuperoSec: x.recuperoSec || recupero || undefined }))
  }
  const succ = voci[i + 1]
  if (!succ || 'circuito' in succ) return voci
  const usate = new Set(voci.flatMap((x) => ('circuito' in x || !x.superserie ? [] : [x.superserie])))
  const lettera = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !usate.has(l)) ?? 'Z'
  // se la successiva e' gia' in una coppia, la voce si aggiunge a quella (tri-serie)
  const g = succ.superserie ?? lettera
  // si passa subito al successivo: il recupero resta solo sull'ultimo della coppia
  const recupero = Math.max(v.recuperoSec ?? 0, succ.recuperoSec ?? 0) || undefined
  return voci.map((x, k) => (k === i ? { ...v, superserie: g, recuperoSec: 0 } : k === i + 1 ? { ...succ, superserie: g, recuperoSec: succ.superserie ? succ.recuperoSec : recupero } : x))
}

// ---------- spostamenti e superserie ----------

export const chiaveBlocco = (b: Blocco) => (b.tipo === 'core' ? `core:${b.variante}` : `${b.tipo}:${b.sedutaId}`)
const isCirc = (v: VocePalestra): v is Exclude<VocePalestra, Prescrizione> => 'circuito' in v

/** Toglie la voce dalla sua superserie: se era senza recupero riprende `recupero` (o quello di default). */
function senzaSuperserie(v: Prescrizione, recupero?: number): Prescrizione {
  return { ...v, superserie: undefined, recuperoSec: v.recuperoSec || recupero || prescrizioneDefault(esercizio(v.esercizioId)).recuperoSec }
}

/**
 * Riporta le superserie in uno stato coerente dopo uno spostamento: i membri di un gruppo
 * devono essere consecutivi (resta il tratto piu' lungo, gli altri escono), un gruppo di un
 * solo esercizio si scioglie, il recupero sta solo sull'ultimo del gruppo.
 */
export function normalizzaSuperserie(voci: VocePalestra[]): VocePalestra[] {
  const out = [...voci]
  const gruppi = new Map<string, number[]>()
  out.forEach((v, i) => {
    if (!isCirc(v) && v.superserie) gruppi.set(v.superserie, [...(gruppi.get(v.superserie) ?? []), i])
  })
  for (const idx of gruppi.values()) {
    const membri = idx.map((i) => out[i] as Prescrizione)
    const recupero = Math.max(0, ...membri.map((x) => x.recuperoSec ?? 0)) || undefined
    // tratti di indici consecutivi; vince il piu' lungo (a parita' il primo)
    const tratti: number[][] = []
    for (const i of idx) {
      const t = tratti.at(-1)
      if (t && t.at(-1) === i - 1) t.push(i)
      else tratti.push([i])
    }
    const tieni = tratti.reduce((a, b) => (b.length > a.length ? b : a))
    for (const i of idx) if (tieni.length < 2 || !tieni.includes(i)) out[i] = senzaSuperserie(out[i] as Prescrizione, recupero)
    if (tieni.length >= 2) tieni.forEach((i, k) => (out[i] = { ...(out[i] as Prescrizione), recuperoSec: k === tieni.length - 1 ? recupero : 0 }))
  }
  return out
}

/**
 * Sposta una voce, anche da un blocco a un altro. `a.indice` e' la posizione di inserimento
 * nella lista di destinazione com'era prima dello spostamento. Uscendo dal blocco la voce
 * lascia la superserie; i circuiti restano nel blocco palestra.
 */
export function spostaVoce(p: Programma, da: { blocco: Blocco; indice: number }, a: { blocco: Blocco; indice: number }): Programma {
  const sorgente = vociBlocco(p, da.blocco)
  const v = sorgente[da.indice]
  if (!v) return p
  const stesso = chiaveBlocco(da.blocco) === chiaveBlocco(a.blocco)
  if (stesso) {
    const dest = a.indice > da.indice ? a.indice - 1 : a.indice
    if (dest === da.indice) return p
    const n = sorgente.filter((_, k) => k !== da.indice)
    n.splice(dest, 0, v)
    return conVoci(p, da.blocco, normalizzaSuperserie(n))
  }
  if (isCirc(v) && a.blocco.tipo !== 'palestra') return p
  const recuperoGruppo = (g: string) => Math.max(0, ...sorgente.map((x) => (!isCirc(x) && x.superserie === g ? (x.recuperoSec ?? 0) : 0))) || undefined
  const mossa = isCirc(v) || !v.superserie ? v : senzaSuperserie(v, recuperoGruppo(v.superserie))
  const tolta = conVoci(p, da.blocco, normalizzaSuperserie(sorgente.filter((_, k) => k !== da.indice)))
  const n = [...vociBlocco(tolta, a.blocco)]
  n.splice(Math.min(a.indice, n.length), 0, mossa)
  return conVoci(tolta, a.blocco, normalizzaSuperserie(n))
}

/**
 * Superserie scelta dall'utente: `origine` e `altri` diventano un unico gruppo, messi in fila
 * dalla posizione del primo e nell'ordine in cui compaiono. Chi era nel gruppo e non e' piu'
 * scelto esce; con meno di due esercizi il gruppo si scioglie.
 */
export function impostaSuperserie(voci: VocePalestra[], origine: number, altri: number[]): VocePalestra[] {
  const o = voci[origine]
  if (!o || isCirc(o)) return voci
  const scelti = [...new Set([origine, ...altri])].filter((i) => voci[i] && !isCirc(voci[i])).sort((a, b) => a - b)
  const vecchio = o.superserie
  // gli ex membri non piu' scelti escono dal gruppo
  let out = voci.map((v, i) => (!isCirc(v) && vecchio && v.superserie === vecchio && !scelti.includes(i) ? senzaSuperserie(v) : v))
  if (scelti.length < 2) return normalizzaSuperserie(out.map((v, i) => (i === origine && !isCirc(v) ? senzaSuperserie(v) : v)))
  const usate = new Set(out.flatMap((v, i) => (isCirc(v) || !v.superserie || scelti.includes(i) ? [] : [v.superserie])))
  const lettera = vecchio && !usate.has(vecchio) ? vecchio : ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !usate.has(l)) ?? 'Z')
  const recupero = Math.max(0, ...scelti.map((i) => (out[i] as Prescrizione).recuperoSec ?? 0)) || undefined
  const gruppo = scelti.map((i) => ({ ...(out[i] as Prescrizione), superserie: lettera, recuperoSec: recupero }))
  const resto = out.filter((_, i) => !scelti.includes(i))
  // il gruppo prende il posto del primo scelto
  const inizio = resto.length - out.slice(scelti[0]).filter((_, k) => !scelti.includes(scelti[0] + k)).length
  out = [...resto.slice(0, inizio), ...gruppo, ...resto.slice(inizio)]
  return normalizzaSuperserie(out)
}
