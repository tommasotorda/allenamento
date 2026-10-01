import type { Esercizio, Fase, Memoria, Prescrizione, Serie } from './types'

/** Categorie a cui si applica la riduzione delle serie nelle settimane di scarico. */
const CATEGORIE_SCARICO = new Set(['forza', 'potenza', 'ricostruzione'])

/** In scarico le serie si riducono del 40%: ne restano ceil(60%), minimo 1. */
export function serieEffettive(serie: number, fase: Fase, es: Esercizio): number {
  if (!fase.scarico || !CATEGORIE_SCARICO.has(es.categoria)) return serie
  return Math.max(1, Math.ceil(serie * 0.6 - 1e-9))
}

/** Ripetizioni da mostrare: gli esercizi con rpe 'fase' seguono le ripetizioni della fase se definite. */
export function ripetizioniEffettive(p: Prescrizione, fase: Fase): string | undefined {
  if (p.rpe === 'fase' && fase.ripetizioniForza) return fase.ripetizioniForza
  return p.ripetizioni
}

export function rpeTarget(p: Prescrizione, fase: Fase): string | undefined {
  if (p.rpe === 'fase') return fase.rpeForza
  return p.rpe
}

/** Testo compatto della prescrizione, es. "5 × 3-5 · RPE 7". */
export function testoPrescrizione(p: Prescrizione, fase: Fase, es: Esercizio): string {
  const parti: string[] = []
  const reps = ripetizioniEffettive(p, fase)
  let corpo = ''
  if (reps) corpo = reps
  else if (p.durataSec !== undefined) corpo = typeof p.durataSec === 'number' ? formatSec(p.durataSec) : p.durataSec.replace(/^(\d+)/, '$1 s')
  else if (p.distanzaM !== undefined) corpo = `${p.distanzaM} m`
  if (p.serie) parti.push(corpo ? `${serieEffettive(p.serie, fase, es)} × ${corpo}` : `${serieEffettive(p.serie, fase, es)} serie`)
  else if (corpo) parti.push(corpo)
  const rpe = rpeTarget(p, fase)
  if (rpe) parti.push(`RPE ${rpe}`)
  if (p.serieExtraSx) parti.push(`+${p.serieExtraSx} sx`)
  return parti.join(' · ')
}

export function formatSec(s: number): string {
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`
}

/** Primo numero di una stringa come "8 per lato" o "3-5" (il minimo dell'intervallo). */
export function primoNumero(s: string | number | undefined): number | null {
  if (s === undefined) return null
  if (typeof s === 'number') return s
  const m = s.match(/\d+(?:[.,]\d+)?/)
  return m ? Number(m[0].replace(',', '.')) : null
}

export function arrotonda(kg: number, passo: number): number {
  if (passo <= 0) return kg
  return Math.round(kg / passo) * passo
}

/**
 * Carico suggerito: ultimo carico usato; se nella seduta precedente tutte le serie
 * avevano RPE <= 7, aggiunge l'incremento.
 */
export function caricoSuggerito(serieUltimaSeduta: Serie[], incrementoKg: number): number | null {
  const conCarico = serieUltimaSeduta.filter((s) => s.caricoKg !== null)
  if (conCarico.length === 0) return null
  const ultimo = [...conCarico].sort((a, b) => a.numero - b.numero).at(-1)!.caricoKg!
  const tutteFacili = serieUltimaSeduta.length > 0 && serieUltimaSeduta.every((s) => s.rpe !== null && s.rpe <= 7)
  return tutteFacili ? arrotonda(ultimo + incrementoKg, incrementoKg) : ultimo
}

/** Il nome dice "per lato": si registrano serie separate sx/dx. */
export function perLato(p: Prescrizione): boolean {
  return /per lato/.test(String(p.ripetizioni ?? '')) || /per lato/.test(String(p.durataSec ?? ''))
}

export type Bozza = Pick<Serie, 'ripetizioni' | 'caricoKg' | 'durataSec' | 'distanzaM' | 'rpe'>

/**
 * Valori proposti per una serie. Priorita': memoria (ultimi valori registrati dall'utente),
 * poi l'ultima seduta, poi la prescrizione della scheda. Dopo un reset della memoria si
 * riparte dalla scheda. `caricoApplicato` sostituisce il carico (suggerimento accettato).
 */
export function valoriPrecompilati(
  numero: number,
  opts: { memoria?: Memoria; precedenti: Serie[]; p: Prescrizione; fase: Fase; caricoApplicato?: number | null },
): Bozza {
  const { memoria, precedenti, p, fase } = opts
  const reps = ripetizioniEffettive(p, fase)
  const scheda: Bozza = {
    caricoKg: null,
    ripetizioni: reps?.startsWith('max') ? null : primoNumero(reps),
    durataSec: primoNumero(p.durataSec),
    distanzaM: p.distanzaM ?? null,
    rpe: null,
  }
  let base: Partial<Bozza> | undefined
  if (memoria?.azzerata) base = undefined
  else if (memoria?.serie?.length) base = memoria.serie[numero - 1] ?? memoria.serie.at(-1)
  else if (precedenti.length) {
    const s = precedenti.find((x) => x.numero === numero) ?? precedenti.at(-1)!
    base = { ripetizioni: s.ripetizioni, caricoKg: s.caricoKg, durataSec: s.durataSec, distanzaM: s.distanzaM, rpe: null }
  }
  const out: Bozza = {
    caricoKg: base?.caricoKg ?? scheda.caricoKg,
    ripetizioni: base?.ripetizioni ?? scheda.ripetizioni,
    durataSec: base?.durataSec ?? scheda.durataSec,
    distanzaM: base?.distanzaM ?? scheda.distanzaM,
    rpe: base?.rpe ?? null,
  }
  if (opts.caricoApplicato != null) out.caricoKg = opts.caricoApplicato
  return out
}

/** Gli esercizi a carico, a ripetizioni o a tempo si possono prescrivere sia a ripetizioni sia a tempo. */
export const puoAlternareMisura = (es: Esercizio) => es.tipoRegistrazione === 'carico_ripetizioni' || es.tipoRegistrazione === 'ripetizioni' || es.tipoRegistrazione === 'tempo'

/** Misura con cui si registra l'esercizio: quella scelta nella prescrizione, se diversa da quella di base. */
export function modoRegistrazione(es: Esercizio, p?: Prescrizione): Esercizio['tipoRegistrazione'] {
  if (!p || !puoAlternareMisura(es)) return es.tipoRegistrazione
  if (p.ripetizioni === undefined && p.durataSec !== undefined) return 'tempo'
  if (p.ripetizioni !== undefined && es.tipoRegistrazione === 'tempo') return 'ripetizioni'
  return es.tipoRegistrazione
}

/** Misura delle serie gia' registrate (storico), dai valori salvati. */
export function modoDaSerie(es: Esercizio, serie: Pick<Serie, 'ripetizioni' | 'durataSec'>[]): Esercizio['tipoRegistrazione'] {
  if (!puoAlternareMisura(es) || !serie.length) return es.tipoRegistrazione
  if (serie.every((s) => s.ripetizioni === null && s.durataSec !== null)) return 'tempo'
  if (es.tipoRegistrazione === 'tempo' && serie.every((s) => s.ripetizioni !== null && s.durataSec === null)) return 'ripetizioni'
  return es.tipoRegistrazione
}

/** Prescrizione passata all'altra misura (ripetizioni <-> tempo), mantenendo serie e recupero. */
export function conMisura(p: Prescrizione, misura: 'ripetizioni' | 'tempo'): Prescrizione {
  const lato = perLato(p) ? ' per lato' : ''
  const { ripetizioni: _r, durataSec: _d, rpe, ...resto } = p
  return misura === 'tempo' ? { ...resto, durataSec: lato ? `30${lato}` : 30 } : { ...resto, ripetizioni: `10${lato}`, ...(rpe && rpe !== 'fase' ? { rpe } : {}) }
}
