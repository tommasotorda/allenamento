import type { Esercizio, Fase, Prescrizione, Serie } from './types'

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
