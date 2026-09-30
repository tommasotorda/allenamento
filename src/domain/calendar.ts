import type { Fase, GiornoId, Prescrizione, Programma } from './types'

export const SETTIMANE_CICLO = 12

/** Data locale in formato ISO 'YYYY-MM-DD'. */
export function isoLocale(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

/** Giorni di calendario tra due date ISO, indipendente da fuso e ora legale. */
export function giorniTra(daIso: string, aIso: string): number {
  const [y1, m1, d1] = daIso.split('-').map(Number)
  const [y2, m2, d2] = aIso.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export function aggiungiGiorni(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

/** Lunedi' della settimana che contiene la data. */
export function lunediDi(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = domenica
  return aggiungiGiorni(iso, -((dow + 6) % 7))
}

/** floor((oggi - cicloInizio) / 7) + 1, ciclico ogni 12 settimane. Prima dell'inizio vale 1. */
export function settimanaCiclo(oggiIso: string, cicloInizioIso: string): number {
  const giorni = giorniTra(cicloInizioIso, oggiIso)
  if (giorni < 0) return 1
  return (Math.floor(giorni / 7) % SETTIMANE_CICLO) + 1
}

export function faseDellaSettimana(programma: Programma, settimana: number): Fase {
  const f = programma.fasi.find((f) => f.settimane.includes(settimana))
  if (!f) throw new Error(`Nessuna fase per la settimana ${settimana}`)
  return f
}

/** Il blocco core alterna le varianti: settimane dispari A, pari B. */
export function varianteCore(programma: Programma, settimana: number): { nome: 'A' | 'B'; esercizi: Prescrizione[] } {
  return settimana % 2 === 1
    ? { nome: 'A', esercizi: programma.blocco_core.varianteA }
    : { nome: 'B', esercizi: programma.blocco_core.varianteB }
}

const DOW_A_GIORNO: GiornoId[] = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

export function giornoSettimana(iso: string): GiornoId {
  const [y, m, d] = iso.split('-').map(Number)
  return DOW_A_GIORNO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** Seduta prevista in una data, se c'e'. */
export function sedutaDelGiorno(programma: Programma, iso: string): string | null {
  const g = giornoSettimana(iso)
  return programma.settimana.find((x) => x.giorno === g)?.sedutaId ?? null
}

/** Prossima seduta in programma a partire da una data (inclusa). */
export function prossimaSeduta(programma: Programma, iso: string): { data: string; giorno: GiornoId; sedutaId: string } | null {
  for (let i = 0; i < 7; i++) {
    const data = aggiungiGiorni(iso, i)
    const g = giornoSettimana(data)
    const s = programma.settimana.find((x) => x.giorno === g)
    if (s) return { data, giorno: g, sedutaId: s.sedutaId }
  }
  return null
}
