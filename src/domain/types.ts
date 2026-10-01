// Tipi statici del programma e della libreria esercizi, piu' i record salvati in IndexedDB.

export type Categoria = 'core' | 'forza' | 'ricostruzione' | 'potenza' | 'pista' | 'cardio' | 'mobilita' | 'stretching' | 'yoga'

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
  /** schemi di movimento, usati dal generatore di schede */
  schemi: Schema[]
  /** attrezzi necessari: tutti i gruppi, almeno uno per gruppo ([] = corpo libero) */
  attrezzi: Attrezzo[][]
  /** 1 principiante, 2 intermedio, 3 avanzato */
  livello: 1 | 2 | 3
  /** salti, corsa, atterraggi */
  impatto: boolean
  /** zone sollecitate in modo importante */
  sollecita: Zona[]
  /** multiarticolare e con richiesta di stabilizzazione */
  funzionale: boolean
}

export type Schema =
  | 'squat' | 'hinge' | 'affondo' | 'spinta-orizzontale' | 'spinta-verticale' | 'tirata-orizzontale' | 'tirata-verticale'
  | 'trasporto' | 'anti-estensione' | 'anti-rotazione' | 'anti-flessione-laterale' | 'rotazione' | 'pliometria' | 'balistico'
  | 'locomozione' | 'cardio' | 'mobilita' | 'stretching' | 'yoga' | 'polpacci' | 'ginocchio' | 'scapole' | 'respirazione' | 'isolamento'

export type Attrezzo =
  | 'manubri' | 'kettlebell' | 'bilanciere' | 'trap-bar' | 'panca' | 'sbarra' | 'elastico' | 'cavo' | 'slitta'
  | 'palla-medica' | 'trx' | 'box' | 'landmine' | 'battle-rope' | 'slider' | 'panca-iperestensioni' | 'tappetino' | 'parallele' | 'fitball' | 'macchine-cardio'

export type Zona = 'ginocchia' | 'schiena' | 'spalle' | 'polsi'

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
  /** superserie: gli esercizi con la stessa lettera si alternano (A1, A2), il recupero dopo l'ultimo */
  superserie?: string
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
  /** inizia con il blocco core (varianti A/B a settimane alterne) */
  core?: boolean
  /** mobilita' e attivazione prima del lavoro principale */
  riscaldamento?: Prescrizione[]
}

export type GiornoId = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom'

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
  /** giorno della settimana -> seduta */
  settimana: { giorno: GiornoId; sedutaId: string }[]
  fasi: Fase[]
  blocco_core: { nota_implementazione?: string; varianteA: Prescrizione[]; varianteB: Prescrizione[] }
  sedute: Record<string, Seduta>
}

/** Direzioni di adattamento e obiettivi del questionario. */
export type Obiettivo = 'forza' | 'massa' | 'potenza' | 'resistenza' | 'mobilita' | 'stabilita'

/** Una scheda salvata: l'utente ne ha una attiva e altre in archivio. */
export interface Piano {
  id: string
  nome: string
  origine: 'originale' | 'profilo' | 'questionario' | 'adattamento' | 'copia' | 'libera' | 'importata'
  obiettivi: Obiettivo[]
  /** lunedi' di inizio del ciclo */
  inizio: string
  /** durata prevista: alla scadenza si propone un adattamento */
  settimane: number
  creato: string
  programma: Programma
  /** versione iniziale, per ripristinare i blocchi modificati */
  originale: Programma
  derivaDa?: string
  archiviato?: boolean
  /** risposte del questionario da cui e' nato (per attrezzi e livello) */
  risposte?: import('./generator').Risposte
  /** proposte di adattamento gia' rimandate */
  proposteChiuse?: string[]
}

/** Scheda salvata dall'utente come modello riutilizzabile. */
export interface ProfiloUtente {
  id: string
  nome: string
  obiettivi: Obiettivo[]
  creato: string
  programma: Programma
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
  /** usato solo per migrare i dati precedenti ai piani multipli */
  cicloInizio: string
  pianoAttivo?: string
  sbloccati: string[]
  incrementoCaricoKg: number
}

export interface Misura {
  id?: number
  data: string
  pesoKg: number | null
  vitaCm: number | null
  fcRiposoBpm: number | null
  /** non piu' mostrato nell'app: resta per i dati e i backup gia' esistenti */
  doloreGinocchio: number | null
}

export interface SedutaLog {
  id: string
  data: string
  templateId: string
  /** piano e nome della seduta al momento della registrazione */
  pianoId?: string
  nomeSeduta?: string
  settimanaCiclo: number
  inizio: string
  fine: string | null
  pista: {
    durataMin: number | null
    distanzaM: number | null
    fcMedia: number | null
    ripetuteFatte: number | null
  }
  /** minuti dell'attivita' della seduta (tennis o altro sport; nome storico del campo) */
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

/** Valori ricordati per precompilare la seduta successiva (autocompilazione). */
export interface Memoria {
  /** `es:<esercizio>`, `pista:<esercizio>`, `attivita:<sport>` o `tennis` */
  chiave: string
  /** ultimi valori per numero di serie (indice = numero - 1) */
  serie?: Pick<Serie, 'ripetizioni' | 'caricoKg' | 'durataSec' | 'distanzaM' | 'rpe'>[]
  pista?: SedutaLog['pista']
  minuti?: number
  /** reset: si riparte dai valori della scheda */
  azzerata?: boolean
  aggiornata: string
}
