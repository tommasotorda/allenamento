/**
 * Generatore di schede: dalle risposte del questionario (o da un profilo) costruisce un Programma.
 * Deterministico: stesse risposte, stessa scheda.
 */
import { esercizi, esercizio } from './data'
import { espandi, type MuscoloId } from './muscles'
import { bilanciaVolume, creaSuperserie, priorita, riscaldamentoPer } from './programmazione'
import { isCircuito, type Attrezzo, type Circuito, type Esercizio, type Fase, type GiornoId, type Obiettivo, type Prescrizione, type Programma, type Schema, type Seduta, type VocePalestra, type Zona } from './types'

export interface Risposte {
  /** in ordine di priorita' (il primo decide le fasi e gli esercizi principali) */
  obiettivi: Obiettivo[]
  livello: 1 | 2 | 3
  giorni: GiornoId[]
  durataMin: 30 | 45 | 60 | 75 | 90 | 105 | 120
  attrezzi: Attrezzo[]
  /** esercizi a corpo libero insieme (o al posto) degli attrezzi; assente = si' (schede precedenti) */
  corpoLibero?: boolean
  /** giorni con attrezzi diversi da quelli generali */
  attrezziGiorno?: Partial<Record<GiornoId, AttrezziGiorno>>
  /** come dividere il lavoro tra le sedute */
  suddivisione?: Suddivisione
  /** altri sport praticati durante la settimana */
  sport?: Sport[]
  /** esercizi per seduta, compresi riscaldamento, core e defaticamento (`ripartisci`); assente = in base alla durata */
  eserciziPerSeduta?: number
  /** superserie: nessuna, alcune coppie per seduta, oppure tutta la scheda */
  superserie?: 'no' | 'alcune' | 'tutte'
  coppieSuperserie?: number
  /** suddivisione libera: cosa allenare in ciascun giorno */
  composizione?: Partial<Record<GiornoId, Componente[]>>
  corsa: boolean
  evitare: Zona[]
  focus: Focus[]
}

export interface AttrezziGiorno {
  attrezzi: Attrezzo[]
  corpoLibero: boolean
}

export interface Sport {
  tipo: string
  giorni: GiornoId[]
  durataMin: number
}

export type Suddivisione = 'auto' | 'fullbody' | 'sup-inf' | 'ppl' | 'gruppi' | 'libera'

export type Componente = 'petto' | 'schiena' | 'spalle' | 'bicipiti' | 'tricipiti' | 'quadricipiti' | 'femorali-glutei' | 'polpacci' | 'core' | 'fullbody' | 'potenza' | 'condizionamento' | 'mobilita'

export const NOMI_COMPONENTI: Record<Componente, string> = {
  petto: 'Petto',
  schiena: 'Schiena',
  spalle: 'Spalle',
  bicipiti: 'Bicipiti',
  tricipiti: 'Tricipiti',
  quadricipiti: 'Quadricipiti',
  'femorali-glutei': 'Femorali e glutei',
  polpacci: 'Polpacci',
  core: 'Core',
  fullbody: 'Full body',
  potenza: 'Potenza',
  condizionamento: 'Condizionamento',
  mobilita: 'Mobilità e yoga',
}

export const NOMI_SUDDIVISIONI: Record<Suddivisione, string> = {
  auto: 'Automatica',
  fullbody: 'Full body',
  'sup-inf': 'Superiore / inferiore',
  ppl: 'Spinta / Tirata / Gambe',
  gruppi: 'Gruppi muscolari',
  libera: 'Libera',
}

export type Focus = 'catena-posteriore' | 'schiena-spalle' | 'core' | 'gambe' | 'parte-superiore'

export const NOMI_OBIETTIVI: Record<Obiettivo, string> = {
  forza: 'Forza',
  massa: 'Massa muscolare',
  potenza: 'Potenza',
  resistenza: 'Resistenza',
  mobilita: 'Mobilità',
  stabilita: 'Stabilità',
}

export const NOMI_FOCUS: Record<Focus, string> = {
  'catena-posteriore': 'Lombari e glutei',
  'schiena-spalle': 'Schiena e spalle',
  core: 'Core',
  gambe: 'Gambe',
  'parte-superiore': 'Petto e braccia',
}

const FOCUS_SCHEMI: Record<Focus, Schema[]> = {
  'catena-posteriore': ['hinge'],
  'schiena-spalle': ['tirata-orizzontale', 'tirata-verticale', 'scapole'],
  core: ['anti-estensione', 'anti-rotazione', 'anti-flessione-laterale', 'rotazione'],
  gambe: ['squat', 'affondo'],
  'parte-superiore': ['spinta-orizzontale', 'spinta-verticale'],
}

export const NOMI_ATTREZZI: Record<Attrezzo, string> = {
  manubri: 'Manubri',
  kettlebell: 'Kettlebell',
  bilanciere: 'Bilanciere',
  'trap-bar': 'Trap bar',
  panca: 'Panca',
  sbarra: 'Sbarra',
  elastico: 'Elastici',
  cavo: 'Cavi e macchine',
  slitta: 'Slitta',
  'palla-medica': 'Palla medica',
  trx: 'TRX o anelli',
  box: 'Box o step',
  landmine: 'Landmine',
  'battle-rope': 'Battle rope',
  slider: 'Slider',
  'panca-iperestensioni': 'Panca iperestensioni',
  tappetino: 'Tappetino',
  parallele: 'Parallele',
}

// ---------- disponibilita' degli esercizi ----------

/** L'esercizio non richiede attrezzi (al massimo il tappetino). */
export const aCorpoLibero = (e: Esercizio) => e.attrezzi.every((g) => g.includes('tappetino'))

const CATEGORIE_CON_CARICO = new Set(['forza', 'potenza', 'ricostruzione'])

export function disponibile(e: Esercizio, r: Pick<Risposte, 'attrezzi' | 'evitare' | 'livello' | 'corpoLibero'> & { senzaImpatto?: boolean }): boolean {
  const ha = new Set<Attrezzo>([...r.attrezzi, 'tappetino'])
  if (!e.attrezzi.every((gruppo) => gruppo.some((a) => ha.has(a)))) return false
  // senza "corpo libero" gli esercizi di forza e potenza usano gli attrezzi scelti
  if (r.corpoLibero === false && r.attrezzi.length > 0 && aCorpoLibero(e) && CATEGORIE_CON_CARICO.has(e.categoria)) return false
  if (e.livello > r.livello) return false
  if (e.sollecita.some((z) => r.evitare.includes(z))) return false
  if (e.impatto && (r.evitare.includes('ginocchia') || r.senzaImpatto)) return false
  return true
}

// ---------- parametri per obiettivo ----------

type Ruolo = 'principale' | 'accessorio'

interface Parametri {
  serie: number
  ripetizioni: string
  recuperoSec: number
  durataSec: number
  distanzaM: number
  rpeFase: boolean
}

export const PARAMETRI: Record<Obiettivo, Record<Ruolo, Parametri>> = {
  forza: {
    principale: { serie: 5, ripetizioni: '4-6', recuperoSec: 150, durataSec: 30, distanzaM: 30, rpeFase: true },
    accessorio: { serie: 3, ripetizioni: '6-8', recuperoSec: 90, durataSec: 30, distanzaM: 30, rpeFase: false },
  },
  massa: {
    principale: { serie: 4, ripetizioni: '6-10', recuperoSec: 105, durataSec: 40, distanzaM: 30, rpeFase: true },
    accessorio: { serie: 3, ripetizioni: '10-12', recuperoSec: 60, durataSec: 40, distanzaM: 30, rpeFase: false },
  },
  potenza: {
    principale: { serie: 4, ripetizioni: '3-5', recuperoSec: 120, durataSec: 20, distanzaM: 20, rpeFase: true },
    accessorio: { serie: 3, ripetizioni: '6-8', recuperoSec: 75, durataSec: 30, distanzaM: 20, rpeFase: false },
  },
  resistenza: {
    principale: { serie: 3, ripetizioni: '12-15', recuperoSec: 45, durataSec: 45, distanzaM: 40, rpeFase: false },
    accessorio: { serie: 3, ripetizioni: '15-20', recuperoSec: 30, durataSec: 45, distanzaM: 40, rpeFase: false },
  },
  mobilita: {
    principale: { serie: 3, ripetizioni: '8-10', recuperoSec: 75, durataSec: 40, distanzaM: 20, rpeFase: false },
    accessorio: { serie: 2, ripetizioni: '10-12', recuperoSec: 60, durataSec: 40, distanzaM: 20, rpeFase: false },
  },
  stabilita: {
    principale: { serie: 3, ripetizioni: '8-10', recuperoSec: 90, durataSec: 40, distanzaM: 30, rpeFase: false },
    accessorio: { serie: 3, ripetizioni: '8-12', recuperoSec: 60, durataSec: 40, distanzaM: 30, rpeFase: false },
  },
}

/** Prescrizione di un esercizio secondo obiettivo e ruolo. */
export function prescrivi(e: Esercizio, obiettivo: Obiettivo, ruolo: Ruolo, livello: 1 | 2 | 3): Prescrizione {
  const p = PARAMETRI[obiettivo][ruolo]
  const serie = livello === 1 && p.serie >= 4 ? p.serie - 1 : p.serie
  const bilaterale = e.schemi.some((s) => ['affondo', 'anti-flessione-laterale', 'rotazione'].includes(s)) || e.id === 'stacco_monopodalico'
  const lato = bilaterale ? ' per lato' : ''
  const base: Prescrizione = { esercizioId: e.id, serie, recuperoSec: p.recuperoSec }
  switch (e.tipoRegistrazione) {
    case 'carico_ripetizioni':
      return { ...base, ripetizioni: p.ripetizioni + lato, ...(p.rpeFase && ruolo === 'principale' ? { rpe: 'fase' } : {}) }
    case 'ripetizioni': {
      // esercizi balistici e pliometrici restano a poche ripetizioni
      const esplosivo = e.schemi.includes('pliometria') || e.schemi.includes('balistico')
      return { ...base, ripetizioni: (esplosivo ? '5' : p.ripetizioni) + lato }
    }
    case 'tempo':
      return { ...base, durataSec: lato ? `${p.durataSec} per lato` : p.durataSec, recuperoSec: Math.min(p.recuperoSec, 45) }
    case 'distanza':
      return { ...base, distanzaM: p.distanzaM, recuperoSec: Math.min(p.recuperoSec, 75) }
    case 'pista':
      return { ...base, serie: 1, durataSec: 1200 }
  }
}

// ---------- fasi del ciclo di 12 settimane ----------

const f = (settimane: number[], nome: string, rpeForza: string, extra: Partial<Fase> = {}): Fase => ({ settimane, nome, scarico: false, rpeForza, serieSoglia: 0, ...extra })
const scarico = (settimane: number[], test: boolean): Fase => ({ settimane, nome: test ? 'Scarico e test' : 'Scarico', scarico: true, rpeForza: '6', serieSoglia: 0, test })

export function fasiPer(obiettivo: Obiettivo): Fase[] {
  switch (obiettivo) {
    case 'forza':
      return [f([1, 2, 3], 'Base', '7', { serieSoglia: 4 }), scarico([4], false), f([5, 6, 7], 'Forza', '8', { ripetizioniForza: '3-5', serieSoglia: 5 }), scarico([8], true), f([9, 10, 11], 'Picco', '8.5', { ripetizioniForza: '2-4', serieSoglia: 5 }), scarico([12], true)]
    case 'massa':
      return [f([1, 2, 3], 'Accumulo', '7', { serieSoglia: 4 }), scarico([4], false), f([5, 6, 7], 'Intensificazione', '8', { ripetizioniForza: '6-8', serieSoglia: 5 }), scarico([8], true), f([9, 10, 11], 'Accumulo II', '8.5', { ripetizioniForza: '8-10', serieSoglia: 5 }), scarico([12], true)]
    case 'potenza':
      return [f([1, 2, 3], 'Base', '7', { serieSoglia: 4 }), scarico([4], false), f([5, 6, 7], 'Forza', '8', { ripetizioniForza: '3-4', serieSoglia: 5 }), scarico([8], true), f([9, 10, 11], 'Potenza', '8', { ripetizioniForza: '3', serieSoglia: 5 }), scarico([12], true)]
    case 'resistenza':
      return [f([1, 2, 3], 'Base aerobica', '6.5', { serieSoglia: 4 }), scarico([4], false), f([5, 6, 7], 'Volume', '7', { serieSoglia: 5 }), scarico([8], true), f([9, 10, 11], 'Intensità', '7.5', { serieSoglia: 6 }), scarico([12], true)]
    case 'mobilita':
    case 'stabilita':
      return [f([1, 2, 3], 'Fondamenta', '6', { serieSoglia: 3 }), scarico([4], false), f([5, 6, 7], 'Sviluppo', '7', { serieSoglia: 4 }), scarico([8], true), f([9, 10, 11], 'Consolidamento', '7', { serieSoglia: 4 }), scarico([12], true)]
  }
}

// ---------- modelli di seduta ----------

interface Slot {
  schemi: Schema[]
  ruolo: Ruolo
  /** in alternativa agli schemi: esercizi in cui questi muscoli sono primari */
  muscoli?: MuscoloId[]
}

const P = (...schemi: Schema[]): Slot => ({ schemi, ruolo: 'principale' })
const A = (...schemi: Schema[]): Slot => ({ schemi, ruolo: 'accessorio' })
const Mu = (...muscoli: MuscoloId[]): Slot => ({ schemi: [], ruolo: 'accessorio', muscoli })

const adatto = (e: Esercizio, slot: Slot) =>
  slot.muscoli ? slot.muscoli.some((m) => espandi(e.muscoli)[m] === 3) : e.schemi.some((s) => slot.schemi.includes(s))

interface Modello {
  nome: string
  slot: Slot[]
}

const TOTAL_A: Modello = { nome: 'Total body A', slot: [P('squat'), P('spinta-orizzontale'), A('tirata-orizzontale'), A('hinge'), A('trasporto'), A('spinta-verticale'), A('polpacci'), A('affondo'), A('scapole'), A('tirata-verticale')] }
const TOTAL_B: Modello = { nome: 'Total body B', slot: [P('hinge'), P('tirata-verticale', 'tirata-orizzontale'), A('spinta-verticale'), A('affondo'), A('scapole'), A('spinta-orizzontale'), A('trasporto'), A('squat'), A('tirata-orizzontale'), A('polpacci')] }
const TOTAL_C: Modello = { nome: 'Total body C', slot: [P('affondo', 'squat'), P('tirata-orizzontale'), A('spinta-orizzontale'), A('hinge'), A('trasporto'), A('scapole'), A('tirata-verticale'), A('spinta-verticale'), A('squat'), A('ginocchio')] }
const INF_A: Modello = { nome: 'Gambe e anche A', slot: [P('squat'), A('hinge'), A('affondo'), A('trasporto'), A('polpacci'), A('ginocchio'), A('squat'), A('hinge'), A('affondo'), A('polpacci')] }
const INF_B: Modello = { nome: 'Gambe e anche B', slot: [P('hinge'), A('affondo'), A('squat'), A('hinge'), A('trasporto'), A('polpacci'), A('affondo'), A('ginocchio'), A('squat'), A('hinge')] }
const SUP_A: Modello = { nome: 'Parte superiore A', slot: [P('spinta-orizzontale'), P('tirata-orizzontale'), A('spinta-verticale'), A('scapole'), A('tirata-verticale'), A('trasporto'), A('spinta-orizzontale'), A('tirata-orizzontale'), A('scapole'), A('spinta-verticale')] }
const SUP_B: Modello = { nome: 'Parte superiore B', slot: [P('tirata-verticale'), P('spinta-verticale'), A('tirata-orizzontale'), A('spinta-orizzontale'), A('scapole'), A('trasporto'), A('tirata-verticale'), A('spinta-orizzontale'), A('scapole'), A('tirata-orizzontale')] }
const COND: Modello = { nome: 'Condizionamento', slot: [A('balistico'), A('locomozione'), A('trasporto'), A('pliometria', 'balistico'), A('cardio'), A('anti-rotazione'), A('balistico'), A('trasporto'), A('locomozione'), A('rotazione')] }

const SPINTA: Modello = { nome: 'Spinta', slot: [P('spinta-orizzontale'), P('spinta-verticale'), A('spinta-orizzontale'), Mu('tricipite'), Mu('deltoide-anteriore'), Mu('pettorale-alto', 'pettorale-basso'), A('scapole'), A('spinta-verticale'), Mu('tricipite'), A('spinta-orizzontale')] }
const TIRATA: Modello = { nome: 'Tirata', slot: [P('tirata-verticale'), P('tirata-orizzontale'), A('tirata-orizzontale'), Mu('bicipite'), Mu('deltoide-posteriore'), A('scapole'), A('trasporto'), A('tirata-verticale'), Mu('bicipite'), Mu('trapezio-medio')] }
const GAMBE: Modello = { nome: 'Gambe', slot: [P('squat'), P('hinge'), A('affondo'), A('hinge'), A('polpacci'), A('squat'), Mu('grande-gluteo'), A('ginocchio'), A('affondo'), Mu('adduttori')] }
const PETTO_TRI: Modello = { nome: 'Petto e tricipiti', slot: [P('spinta-orizzontale'), Mu('pettorale-alto', 'pettorale-basso'), A('spinta-orizzontale'), Mu('tricipite'), Mu('pettorale-basso'), Mu('tricipite'), A('spinta-orizzontale'), Mu('deltoide-anteriore'), Mu('tricipite'), Mu('pettorale-alto')] }
const SCHIENA_BI: Modello = { nome: 'Schiena e bicipiti', slot: [P('tirata-verticale'), P('tirata-orizzontale'), Mu('gran-dorsale'), Mu('bicipite'), A('tirata-orizzontale'), Mu('trapezio-medio'), Mu('bicipite'), Mu('lombari', 'erettori-spinali'), Mu('avambraccio-flessori'), A('tirata-verticale')] }
const SPALLE_CORE: Modello = { nome: 'Spalle e core', slot: [P('spinta-verticale'), Mu('deltoide-anteriore'), Mu('deltoide-posteriore'), A('scapole'), Mu('trapezio-alto'), A('anti-rotazione'), A('anti-estensione'), A('anti-flessione-laterale'), A('spinta-verticale'), Mu('deltoide-posteriore')] }
const BRACCIA: Modello = { nome: 'Braccia', slot: [Mu('bicipite'), Mu('tricipite'), Mu('bicipite'), Mu('tricipite'), Mu('avambraccio-flessori'), A('trasporto'), Mu('bicipite'), Mu('tricipite'), A('anti-estensione'), A('rotazione')] }

const SLOT_COMPONENTI: Record<Exclude<Componente, 'mobilita'>, Slot[]> = {
  petto: [P('spinta-orizzontale'), A('spinta-orizzontale'), Mu('pettorale-alto'), Mu('pettorale-basso', 'pettorale-alto')],
  schiena: [P('tirata-verticale'), P('tirata-orizzontale'), A('tirata-orizzontale'), Mu('gran-dorsale'), A('scapole')],
  spalle: [P('spinta-verticale'), Mu('deltoide-anteriore'), Mu('deltoide-posteriore'), A('scapole')],
  bicipiti: [Mu('bicipite'), Mu('bicipite'), Mu('avambraccio-flessori')],
  tricipiti: [Mu('tricipite'), Mu('tricipite'), Mu('tricipite')],
  quadricipiti: [P('squat'), A('affondo'), Mu('retto-femorale', 'vasto-mediale'), A('squat')],
  'femorali-glutei': [P('hinge'), Mu('bicipite-femorale', 'semitendinoso'), Mu('grande-gluteo'), A('hinge')],
  polpacci: [A('polpacci'), A('polpacci')],
  core: [A('anti-estensione'), A('anti-rotazione'), A('anti-flessione-laterale'), A('rotazione')],
  fullbody: TOTAL_A.slot,
  potenza: [A('pliometria', 'balistico'), A('balistico'), A('pliometria')],
  condizionamento: COND.slot,
}

/** Modello di una seduta composta liberamente: prima i fondamentali di ogni componente, poi gli altri a rotazione. */
export function modelloComposto(comp: Componente[]): Modello | null {
  const parti = comp.filter((c): c is Exclude<Componente, 'mobilita'> => c !== 'mobilita')
  if (!parti.length) return null
  const liste = parti.map((c) => SLOT_COMPONENTI[c])
  const principali = liste.flatMap((l) => l.filter((x) => x.ruolo === 'principale'))
  const resto = liste.map((l) => l.filter((x) => x.ruolo !== 'principale'))
  const alterni: Slot[] = []
  for (let i = 0; resto.some((l) => i < l.length); i++) for (const l of resto) if (l[i]) alterni.push(l[i])
  return { nome: comp.map((c) => NOMI_COMPONENTI[c]).join(' + '), slot: [...principali, ...alterni] }
}

/** Sedute in base alla suddivisione scelta; i modelli ripetuti prendono una lettera. */
export function modelliPer(n: number, sudd: Suddivisione = 'auto'): Modello[] {
  const ciclo = (base: Modello[]) => Array.from({ length: n }, (_, i) => base[i % base.length])
  let out: Modello[]
  if (sudd === 'fullbody') out = ciclo([TOTAL_A, TOTAL_B, TOTAL_C])
  else if (sudd === 'sup-inf') out = n === 1 ? [TOTAL_A] : ciclo([INF_A, SUP_A, INF_B, SUP_B])
  else if (sudd === 'ppl') out = n < 3 ? modelliPer(n, 'sup-inf') : ciclo([SPINTA, TIRATA, GAMBE])
  else if (sudd === 'gruppi') out = n < 3 ? modelliPer(n, 'sup-inf') : ciclo([PETTO_TRI, SCHIENA_BI, GAMBE, SPALLE_CORE, BRACCIA, INF_B].slice(0, Math.max(3, Math.min(n, 6))))
  else out = modelli(n)
  // nomi distinti se lo stesso modello torna piu' volte nella settimana
  const visti = new Map<Modello, number>()
  return out.map((m) => {
    const k = (visti.get(m) ?? 0) + 1
    visti.set(m, k)
    const ripetuto = out.filter((x) => x === m).length > 1
    return ripetuto && !/ [A-C]$/.test(m.nome) ? { ...m, nome: `${m.nome} ${String.fromCharCode(64 + k)}` } : m
  })
}

function modelli(n: number): Modello[] {
  switch (n) {
    case 1:
      return [TOTAL_A]
    case 2:
      return [TOTAL_A, TOTAL_B]
    case 3:
      return [TOTAL_A, TOTAL_B, TOTAL_C]
    case 4:
      return [INF_A, SUP_A, INF_B, SUP_B]
    case 5:
      return [INF_A, SUP_A, COND, INF_B, SUP_B]
    default:
      return [INF_A, SUP_A, TOTAL_C, INF_B, SUP_B, COND].slice(0, n)
  }
}

const SLOT_PER_DURATA: Record<Risposte['durataMin'], number> = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8, 105: 9, 120: 10 }

/**
 * Numero di esercizi scelto dall'utente: vale per tutta la seduta, quindi si divide tra riscaldamento,
 * palestra e defaticamento (il core entra tra gli esercizi della palestra, senza blocco a parte).
 * Le sedute di sola mobilita' sono tutte defaticamento. Piu' esercizi = mai meno lavoro in palestra.
 */
export function ripartisci(n: number, conPalestra: boolean, conMobilita: boolean) {
  if (!conPalestra) return { riscaldamento: 0, palestra: 0, mobilita: n }
  const riscaldamento = n >= 10 ? 2 : n >= 5 ? 1 : 0
  const mobilita = conMobilita ? Math.max(2, Math.round(n * 0.3)) : n >= 7 ? 2 : 1
  return { riscaldamento, palestra: Math.max(2, n - riscaldamento - mobilita), mobilita }
}

// ---------- scelta degli esercizi ----------

const PALESTRA_CATEGORIE = new Set(['forza', 'potenza', 'core', 'ricostruzione'])

class Selettore {
  private usati = new Map<string, number>()
  private r: Risposte
  constructor(r: Risposte) {
    this.r = r
  }

  private punteggio(e: Esercizio, slot: Slot): number {
    const r = this.r
    let s = 0
    if (e.funzionale) s += r.obiettivi.includes('stabilita') ? 3 : 1.5
    if (slot.ruolo === 'principale' && e.tipoRegistrazione === 'carico_ripetizioni') s += 2
    if (slot.ruolo === 'principale' && e.schemi[0] === slot.schemi[0]) s += 1.5
    if (slot.schemi.includes(e.schemi[0])) s += 1
    if (slot.muscoli) s += slot.muscoli.filter((m) => espandi(e.muscoli)[m] === 3).length - Object.values(espandi(e.muscoli)).filter((l) => l === 3).length * 0.3
    // negli slot per muscolo si preferisce l'esercizio dedicato (isolamento) al multiarticolare
    if (slot.muscoli && e.schemi.includes('isolamento')) s += 2.5
    // per forza e massa i principali sono i fondamentali, non gli esercizi esplosivi
    if (slot.ruolo === 'principale' && ['forza', 'massa'].includes(r.obiettivi[0]) && e.categoria === 'forza') {
      s += 2
      if (e.attrezzi.some((g) => g.includes('bilanciere') || g.includes('trap-bar'))) s += 1
    }
    // i fondamentali sono multiarticolari con carico, non lavori per le scapole o di isolamento
    if (slot.ruolo === 'principale' && e.schemi.some((x) => x === 'scapole' || x === 'isolamento')) s -= 3
    if (e.categoria === 'potenza' && !r.obiettivi.includes('potenza')) s -= 1.5
    if (e.impatto) s -= slot.schemi.includes('pliometria') ? 1 : 3
    // un solo fondamentale pesante sulla colonna per seduta: da complementare si preferiscono varianti piu' leggere
    if (slot.ruolo === 'accessorio' && e.attrezzi.some((g) => g.includes('bilanciere') || g.includes('trap-bar')) && e.schemi.some((x) => x === 'squat' || x === 'hinge')) s -= 3
    if (r.corpoLibero !== false && r.attrezzi.length > 0 && aCorpoLibero(e)) s += 0.5
    s -= Math.abs(e.livello - r.livello) * 0.5
    for (const fo of r.focus) if (e.schemi.some((x) => FOCUS_SCHEMI[fo].includes(x))) s += 1
    if (r.focus.includes('catena-posteriore') && (espandi(e.muscoli).lombari ?? 0) >= 2) s += 1
    if (r.focus.includes('schiena-spalle') && (espandi(e.muscoli)['deltoide-posteriore'] ?? 0) >= 2) s += 1
    if (r.obiettivi[0] === 'potenza' && (e.schemi.includes('balistico') || e.schemi.includes('pliometria'))) s += 1
    s -= (this.usati.get(e.id) ?? 0) * 4
    return s
  }

  scegli(slot: Slot, esclusi: Set<string>, categorie = PALESTRA_CATEGORIE, ctx: Parameters<typeof disponibile>[1] = this.r): Esercizio | null {
    // i salti vanno solo dove previsti, a meno che l'obiettivo sia potenza o resistenza
    const saltiAmmessi = slot.schemi.some((x) => ['pliometria', 'locomozione', 'cardio'].includes(x)) || this.r.obiettivi.some((o) => o === 'potenza' || o === 'resistenza')
    const candidati = esercizi.filter((e) => categorie.has(e.categoria) && !esclusi.has(e.id) && adatto(e, slot) && disponibile(e, ctx) && (saltiAmmessi || !e.impatto))
    if (!candidati.length) return null
    const migliore = candidati.map((e) => ({ e, p: this.punteggio(e, slot) })).sort((a, b) => b.p - a.p || a.e.id.localeCompare(b.e.id))[0].e
    this.usati.set(migliore.id, (this.usati.get(migliore.id) ?? 0) + 1)
    return migliore
  }

  /** Scelta per muscoli: esercizi di allungamento/mobilita' per i muscoli piu' usati nella seduta. */
  scegliRecupero(muscoliSeduta: Record<string, number>, n: number, categorie: string[], esclusi: Set<string>, ctx: Parameters<typeof disponibile>[1] = this.r): Esercizio[] {
    const out: Esercizio[] = []
    const cand = esercizi
      .filter((e) => categorie.includes(e.categoria) && disponibile(e, ctx) && !esclusi.has(e.id))
      .map((e) => {
        const m = espandi(e.muscoli)
        const affinita = Object.entries(m).reduce((t, [k, v]) => t + v * (muscoliSeduta[k] ?? 0), 0)
        return { e, p: affinita - (this.usati.get(e.id) ?? 0) * 6 }
      })
      .sort((a, b) => b.p - a.p || a.e.id.localeCompare(b.e.id))
    for (const { e } of cand) {
      if (out.length >= n) break
      out.push(e)
      this.usati.set(e.id, (this.usati.get(e.id) ?? 0) + 1)
    }
    return out
  }
}

// ---------- pista ----------

const PISTE: Record<string, { esercizioId: string; prescrizione: string; scarico: string }> = {
  zona2: { esercizioId: 'corsa_zona2', prescrizione: '25-35 min in Zona 2, ritmo al quale riesci a parlare', scarico: '20 min in Zona 2' },
  soglia: { esercizioId: 'ripetute_soglia', prescrizione: '10 min riscaldamento, ripetute da 4 min all\'85-90% FC max con 2 min di corsa lenta; numero di ripetute dalla fase', scarico: '25 min in Zona 2' },
  intervalli: { esercizioId: 'intervalli_30_30', prescrizione: '10 min riscaldamento, 2 blocchi da 8 x (30 s veloci / 30 s lenti) con 3 min tra i blocchi', scarico: '20 min in Zona 2 + 4 allunghi' },
  sprint: { esercizioId: 'sprint_salita', prescrizione: '10 min riscaldamento, 6-8 sprint in salita da 10-15 s con recupero camminando in discesa', scarico: '20 min in Zona 2' },
}

// ---------- generazione ----------

export function generaProgramma(r: Risposte): Programma {
  const giorni = [...r.giorni]
  const primario = r.obiettivi[0] ?? 'stabilita'
  const secondario = r.obiettivi[1] ?? primario
  const sel = new Selettore(r)
  const soloMobilita = r.obiettivi.length > 0 && r.obiettivi.every((o) => o === 'mobilita' || o === 'stabilita') && r.obiettivi.includes('mobilita')
  const nSlot = SLOT_PER_DURATA[r.durataMin]
  const principali = new Set<Prescrizione>()
  const sedute: Record<string, Seduta> = {}
  const settimana: Programma['settimana'] = []

  const ms = modelliPer(giorni.length, r.suddivisione)
  const sportDel = (g: GiornoId) => (r.sport ?? []).filter((x) => x.giorni.includes(g))
  giorni.forEach((giorno, i) => {
    const id = `s${i + 1}`
    const composizione = r.suddivisione === 'libera' ? (r.composizione?.[giorno] ?? ['fullbody']) : null
    const modello = composizione ? modelloComposto(composizione) : soloMobilita && i % 2 === 1 ? null : ms[i % ms.length]
    const conMobilita = soloMobilita || r.obiettivi.includes('mobilita') || !!composizione?.includes('mobilita')
    // attrezzi del giorno; se lo stesso giorno c'e' uno sport, niente salti e un esercizio in meno
    const sportOggi = sportDel(giorno)
    const ctx = { ...r, ...(r.attrezziGiorno?.[giorno] ?? {}), senzaImpatto: sportOggi.length > 0 }
    const esclusi = new Set<string>()
    const palestra: VocePalestra[] = []
    const quota = r.eserciziPerSeduta !== undefined ? ripartisci(r.eserciziPerSeduta, !!modello, conMobilita) : null
    const muscoliSeduta: Record<string, number> = {}
    const aggiungi = (p: Prescrizione) => {
      palestra.push(p)
      esclusi.add(p.esercizioId)
      const es = esercizi.find((e) => e.id === p.esercizioId)!
      for (const [k, v] of Object.entries(espandi(es.muscoli))) muscoliSeduta[k] = Math.max(muscoliSeduta[k] ?? 0, v)
    }

    if (modello) {
      // la potenza apre la seduta con un esercizio esplosivo
      if (r.obiettivi.includes('potenza') && modello !== COND && !sportOggi.length) {
        const e = sel.scegli(A('pliometria', 'balistico'), esclusi, new Set(['potenza']), ctx)
        if (e) aggiungi(prescrivi(e, 'potenza', 'accessorio', r.livello))
      }
      // esplosivi in apertura e circuito finale occupano il posto di un esercizio ciascuno
      // con il numero di esercizi scelto il circuito conta per tutti i suoi esercizi (e serve spazio)
      const conCircuito = r.obiettivi.includes('resistenza') && modello !== COND && r.durataMin >= 45 && (!quota || quota.palestra >= 6)
      const posti = quota
        ? Math.max(1, quota.palestra - palestra.length - (conCircuito ? 3 : 0))
        : Math.max(3, nSlot - palestra.length - (conCircuito ? 1 : 0) - (sportOggi.length ? 1 : 0))
      // si scorrono gli slot finche' la seduta ha il numero di esercizi richiesto; al secondo giro sono complementari
      const totale = palestra.length + posti
      for (let k = 0; palestra.length < totale && k < modello.slot.length * 2; k++) {
        const base = modello.slot[k % modello.slot.length]
        const slot: Slot = k < modello.slot.length ? base : { ...base, ruolo: 'accessorio' }
        const e = sel.scegli(slot, esclusi, undefined, ctx)
        if (!e) continue
        const p = prescrivi(e, slot.ruolo === 'principale' ? primario : secondario, slot.ruolo, r.livello)
        if (slot.ruolo === 'principale') principali.add(p)
        aggiungi(p)
      }
      // ordine: esplosivi, fondamentali, complementari, isolamento, trasporti, core
      palestra.sort((a, b) => (isCircuito(a) || isCircuito(b) ? 0 : priorita(esercizio(a.esercizioId), principali.has(a)) - priorita(esercizio(b.esercizioId), principali.has(b))))
      // la resistenza chiude con un circuito
      if (conCircuito) {
        const scelti = [A('balistico', 'locomozione'), A('anti-estensione', 'anti-rotazione'), A('trasporto', 'cardio')]
          .map((s) => sel.scegli(s, esclusi, undefined, ctx))
          .filter((e): e is Esercizio => !!e)
        if (scelti.length >= 2) {
          scelti.forEach((e) => esclusi.add(e.id))
          const c: Circuito = { circuito: true, giri: r.livello === 1 ? 3 : 4, lavoroSec: 40, pausaSec: 20, esercizi: scelti.map((e) => e.id) }
          palestra.push(c)
        }
      }
    }

    // defaticamento: mobilita', stretching e yoga per i muscoli usati
    const lunga = r.durataMin >= 90 ? 2 : 0
    const quanti = quota ? quota.mobilita : (soloMobilita || (composizione && !modello) ? 7 : conMobilita ? 4 : 2) + lunga
    const categorie = conMobilita ? ['stretching', 'yoga', 'mobilita'] : ['stretching', 'mobilita']
    const recupero = sel.scegliRecupero(Object.keys(muscoliSeduta).length ? muscoliSeduta : { 'erettori-spinali': 2, femorali: 2, 'grande-gluteo': 2 }, quanti, categorie, esclusi, ctx)
    const mobilita = recupero.map((e) => prescrivi(e, 'mobilita', 'accessorio', r.livello)).map((p) => ({ ...p, serie: p.serie && p.serie > 2 ? 2 : p.serie, recuperoSec: undefined }))

    const nome = modello ? (soloMobilita && !composizione ? 'Forza e controllo' : modello.nome) : 'Mobilità e yoga'
    const seduta: Seduta = { nome, palestra, mobilita, core: !!modello && !quota && r.durataMin >= 45 }
    if (sportOggi.length) seduta.attivita = attivitaDi(sportOggi)
    if (palestra.length && (!quota || quota.riscaldamento)) seduta.riscaldamento = riscaldamentoPer(palestra, (e) => disponibile(e, ctx), esclusi, quota?.riscaldamento)
    // corsa: Zona 2 nella prima seduta, lavoro di qualita' in una seduta a meta' settimana
    if (r.corsa) {
      const n = giorni.length
      if (i === 0) seduta.pista = PISTE.zona2
      else if (n >= 3 && i === Math.floor(n / 2)) seduta.pista = r.obiettivi.includes('potenza') ? PISTE.sprint : r.obiettivi.includes('resistenza') ? PISTE.soglia : PISTE.intervalli
    }
    sedute[id] = seduta
    settimana.push({ giorno, sedutaId: id })
  })

  // giorni di solo sport: l'attivita' e un defaticamento
  let k = 0
  for (const g of ORDINE_GIORNI) {
    const sp = sportDel(g)
    if (!sp.length || giorni.includes(g)) continue
    const id = `sport${++k}`
    const ctx = { ...r, ...(r.attrezziGiorno?.[g] ?? {}) }
    const recupero = sel.scegliRecupero({ 'grande-gluteo': 2, femorali: 2, quadricipiti: 2, 'erettori-spinali': 2, polpacci: 2 }, 3, ['stretching', 'mobilita'], new Set(), ctx)
    const att = attivitaDi(sp)
    sedute[id] = {
      nome: att.tipo[0].toUpperCase() + att.tipo.slice(1),
      attivita: att,
      palestra: [],
      mobilita: recupero.map((e) => ({ ...prescrivi(e, 'mobilita', 'accessorio', r.livello), serie: 1, recuperoSec: undefined })),
      core: false,
    }
    settimana.push({ giorno: g, sedutaId: id })
  }
  settimana.sort((a, b) => ORDINE_GIORNI.indexOf(a.giorno) - ORDINE_GIORNI.indexOf(b.giorno))

  // core: due varianti che si alternano a settimane
  const selCore = new Selettore({ ...r, obiettivi: ['stabilita'] })
  const variante = (schemi: Schema[][]): Prescrizione[] => {
    const esclusi = new Set<string>()
    const out: Prescrizione[] = []
    for (const sc of schemi) {
      const e = selCore.scegli(A(...sc), esclusi, new Set(['core']))
      if (!e) continue
      esclusi.add(e.id)
      out.push({ ...prescrivi(e, 'stabilita', 'accessorio', r.livello), recuperoSec: 20 })
    }
    return out
  }
  const blocco_core = {
    varianteA: variante([['anti-estensione'], ['anti-rotazione'], ['anti-flessione-laterale']]),
    varianteB: variante([['anti-rotazione', 'locomozione'], ['anti-estensione'], ['anti-flessione-laterale', 'rotazione']]),
  }

  const programma: Programma = { settimana, fasi: fasiPer(primario), blocco_core, sedute }
  // volume settimanale per gruppo muscolare dentro gli intervalli dell'obiettivo
  bilanciaVolume(programma, primario, r.livello, principali)
  // superserie a richiesta
  if (r.superserie && r.superserie !== 'no') {
    for (const sd of Object.values(sedute)) {
      if (sd.palestra?.length) sd.palestra = creaSuperserie(sd.palestra, r.superserie, r.coppieSuperserie ?? 1, principali)
    }
  }
  return programma
}

const ORDINE_GIORNI: GiornoId[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

/** Uno o piu' sport nello stesso giorno diventano un'unica attivita'. */
function attivitaDi(sport: Sport[]): { tipo: string; durataMin: number } {
  return { tipo: sport.map((x) => x.tipo.toLowerCase()).join(' + '), durataMin: Math.max(...sport.map((x) => x.durataMin)) }
}

export function nomeScheda(r: Risposte): string {
  return `${r.obiettivi.map((o) => NOMI_OBIETTIVI[o]).join(' + ') || 'Scheda'} · ${r.giorni.length} giorni`
}

export const RISPOSTE_VUOTE: Risposte = {
  obiettivi: [],
  livello: 1,
  giorni: ['lun', 'mer', 'ven'],
  durataMin: 45,
  attrezzi: [],
  corpoLibero: true,
  corsa: false,
  evitare: [],
  focus: [],
}
