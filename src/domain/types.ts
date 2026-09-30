// Tipi statici del programma e della libreria esercizi, piu' i record salvati in IndexedDB.

export type Categoria = 'core' | 'forza' | 'ricostruzione' | 'potenza' | 'pista' | 'mobilita'

export type TipoRegistrazione = 'carico_ripetizioni' | 'ripetizioni' | 'tempo' | 'distanza' | 'pista'

export interface Esercizio {
  id: string
  nome: string
  categoria: Categoria
  attrezzatura: string[]
  tipoRegistrazione: TipoRegistrazione
  esecuzione: string[]
  sbloccabile: boolean
  /** muscolo o alias -> livello 1-3 (vedi domain/muscles.ts) */
  muscoli: Record<string, number>
}

/** Prescrizione di un esercizio all'interno di una seduta. */
export interface Prescrizione {
  esercizioId: string
  serie?: number
  ripetizioni?: string
  durataSec?: number | string
  distanzaM?: number
  recuperoSec?: number
  /** 'fase' = usa l'RPE della fase corrente */
  rpe?: string
  serieExtraSx?: number
  alternativa?: string
  superserieCon?: string
  sostituisce?: string
}

export interface Circuito {
  circuito: true
  giri: number
  lavoroSec: number
  pausaSec: number
  esercizi: string[]
}

export type VocePalestra = Prescrizione | Circuito

export interface Pista {
  esercizioId: string
  prescrizione: string
  scarico?: string
}

export interface Seduta {
  nome: string
  pista?: Pista
  palestra?: VocePalestra[]
  sbloccabili?: Prescrizione[]
  attivita?: { tipo: string; durataMin: number }
  mobilita?: Prescrizione[]
}

export type GiornoId = 'lun' | 'mar' | 'mer' | 'gio' | 'ven'

export interface Fase {
  settimane: number[]
  nome: string
  scarico: boolean
  rpeForza: string
  serieSoglia: number
  ripetizioniForza?: string
  test?: boolean
}

export interface Programma {
  settimana: { giorno: GiornoId; sedutaId: GiornoId }[]
  fasi: Fase[]
  blocco_core: { nota_implementazione: string; varianteA: Prescrizione[]; varianteB: Prescrizione[] }
  sedute: Record<GiornoId, Seduta>
}

export interface TestDef {
  id: string
  nome: string
  unita: string
  meglio: 'alto' | 'basso'
}

export const isCircuito = (v: VocePalestra): v is Circuito => 'circuito' in v

// ---- Record del database ----

export interface Impostazioni {
  chiave: 'singleton'
  cicloInizio: string
  sbloccati: string[]
  incrementoCaricoKg: number
}

export interface Misura {
  id?: number
  data: string
  pesoKg: number | null
  vitaCm: number | null
  fcRiposoBpm: number | null
  doloreGinocchio: number | null
}

export interface SedutaLog {
  id: string
  data: string
  templateId: GiornoId
  settimanaCiclo: number
  inizio: string
  fine: string | null
  pista: {
    durataMin: number | null
    distanzaM: number | null
    fcMedia: number | null
    ripetuteFatte: number | null
  }
  tennisMin: number | null
}

export interface Serie {
  id: string
  sedutaId: string
  esercizioId: string
  data: string
  numero: number
  ripetizioni: number | null
  caricoKg: number | null
  durataSec: number | null
  distanzaM: number | null
  lato: 'sx' | 'dx' | null
  rpe: number | null
}

export interface RisultatoTest {
  id?: number
  testId: string
  data: string
  valore: number
}

export interface FotoEsercizio {
  id?: number
  esercizioId: string
  blob: Blob
  creata: string
}
