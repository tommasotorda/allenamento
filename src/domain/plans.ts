/** Piani (schede salvate): creazione, piano originale dal JSON, scadenza. */
import { aggiungiGiorni, giorniTra, lunediDi } from './calendar'
import { programma as programmaJson } from './data'
import { fasiPer } from './generator'
import type { GiornoId, Obiettivo, Piano, Prescrizione, Programma, Seduta } from './types'
import { clona, uuid } from './util'

export const SETTIMANE_PIANO = 12
export const ID_ORIGINALE = 'originale'

export function creaPiano(opts: {
  nome: string
  origine: Piano['origine']
  obiettivi: Obiettivo[]
  programma: Programma
  inizio: string
  derivaDa?: string
  id?: string
}): Piano {
  return {
    id: opts.id ?? uuid(),
    nome: opts.nome,
    origine: opts.origine,
    obiettivi: opts.obiettivi,
    inizio: lunediDi(opts.inizio),
    settimane: SETTIMANE_PIANO,
    creato: new Date().toISOString(),
    programma: clona(opts.programma),
    originale: clona(opts.programma),
    derivaDa: opts.derivaDa,
  }
}

/** Modifiche salvate prima dei piani multipli (tabella `schede`, versione 2 del database). */
export interface SchedaLegacy {
  sedute: Record<string, Pick<Seduta, 'palestra' | 'mobilita'>>
  core?: { varianteA: Prescrizione[]; varianteB: Prescrizione[] }
}

/** Il piano del file JSON iniziale, con le eventuali modifiche fatte in precedenza. */
export function pianoOriginale(inizio: string, legacy?: SchedaLegacy): Piano {
  const p = creaPiano({ id: ID_ORIGINALE, nome: 'Piano originale', origine: 'originale', obiettivi: ['forza', 'resistenza', 'stabilita'], programma: programmaJson, inizio })
  if (legacy) {
    for (const [g, over] of Object.entries(legacy.sedute)) p.programma.sedute[g] = { ...p.programma.sedute[g], ...clona(over) }
    if (legacy.core) p.programma.blocco_core = { ...p.programma.blocco_core, ...clona(legacy.core) }
  }
  return p
}

export function scadenza(p: Piano): string {
  return aggiungiGiorni(p.inizio, p.settimane * 7)
}

export function scaduto(p: Piano, oggi: string): boolean {
  return giorniTra(scadenza(p), oggi) >= 0
}

/** Settimane trascorse dall'inizio del piano (1 = prima settimana), senza ricominciare il ciclo. */
export function settimanaAssoluta(p: Piano, oggi: string): number {
  return Math.max(1, Math.floor(giorniTra(p.inizio, oggi) / 7) + 1)
}

/** Scheda libera: sedute vuote nei giorni scelti, da riempire esercizio per esercizio. */
export function pianoLibero(opts: { nome: string; giorni: GiornoId[]; progressione: Obiettivo; inizio: string }): Piano {
  const sedute: Record<string, Seduta> = {}
  const settimana: Programma['settimana'] = []
  opts.giorni.forEach((giorno, i) => {
    const id = `s${i + 1}`
    sedute[id] = { nome: `Seduta ${String.fromCharCode(65 + i)}`, palestra: [], mobilita: [], core: false }
    settimana.push({ giorno, sedutaId: id })
  })
  const programma: Programma = { settimana, fasi: fasiPer(opts.progressione), blocco_core: { varianteA: [], varianteB: [] }, sedute }
  return creaPiano({ nome: opts.nome, origine: 'libera', obiettivi: [opts.progressione], programma, inizio: opts.inizio })
}
