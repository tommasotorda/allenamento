/**
 * Generatore di schede: dalle risposte del questionario (o da un profilo) costruisce un Programma.
 * Deterministico: stesse risposte, stessa scheda.
 */
import { esercizi } from './data'
import { espandi } from './muscles'
import type { Attrezzo, Circuito, Esercizio, Fase, GiornoId, Obiettivo, Prescrizione, Programma, Schema, Seduta, VocePalestra, Zona } from './types'

export interface Risposte {
  /** in ordine di priorita' (il primo decide le fasi e gli esercizi principali) */
  obiettivi: Obiettivo[]
  livello: 1 | 2 | 3
  giorni: GiornoId[]
  durataMin: 30 | 45 | 60 | 75
  attrezzi: Attrezzo[]
  corsa: boolean
  evitare: Zona[]
  focus: Focus[]
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
}

// ---------- disponibilita' degli esercizi ----------

export function disponibile(e: Esercizio, r: Pick<Risposte, 'attrezzi' | 'evitare' | 'livello'>): boolean {
  const ha = new Set<Attrezzo>([...r.attrezzi, 'tappetino'])
  if (!e.attrezzi.every((gruppo) => gruppo.some((a) => ha.has(a)))) return false
  if (e.livello > r.livello) return false
  if (e.sollecita.some((z) => r.evitare.includes(z))) return false
  if (e.impatto && r.evitare.includes('ginocchia')) return false
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
}

const P = (...schemi: Schema[]): Slot => ({ schemi, ruolo: 'principale' })
const A = (...schemi: Schema[]): Slot => ({ schemi, ruolo: 'accessorio' })

interface Modello {
  nome: string
  slot: Slot[]
}

const TOTAL_A: Modello = { nome: 'Total body A', slot: [P('squat'), P('spinta-orizzontale'), A('tirata-orizzontale'), A('hinge'), A('trasporto'), A('spinta-verticale'), A('polpacci')] }
const TOTAL_B: Modello = { nome: 'Total body B', slot: [P('hinge'), P('tirata-verticale', 'tirata-orizzontale'), A('spinta-verticale'), A('affondo'), A('scapole'), A('spinta-orizzontale'), A('trasporto')] }
const TOTAL_C: Modello = { nome: 'Total body C', slot: [P('affondo', 'squat'), P('tirata-orizzontale'), A('spinta-orizzontale'), A('hinge'), A('trasporto'), A('scapole'), A('tirata-verticale')] }
const INF_A: Modello = { nome: 'Gambe e anche A', slot: [P('squat'), A('hinge'), A('affondo'), A('trasporto'), A('polpacci'), A('ginocchio')] }
const INF_B: Modello = { nome: 'Gambe e anche B', slot: [P('hinge'), A('affondo'), A('squat'), A('hinge'), A('trasporto'), A('polpacci')] }
const SUP_A: Modello = { nome: 'Parte superiore A', slot: [P('spinta-orizzontale'), P('tirata-orizzontale'), A('spinta-verticale'), A('scapole'), A('tirata-verticale'), A('trasporto')] }
const SUP_B: Modello = { nome: 'Parte superiore B', slot: [P('tirata-verticale'), P('spinta-verticale'), A('tirata-orizzontale'), A('spinta-orizzontale'), A('scapole'), A('trasporto')] }
const COND: Modello = { nome: 'Condizionamento', slot: [A('balistico'), A('locomozione'), A('trasporto'), A('pliometria', 'balistico'), A('cardio')] }

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

const SLOT_PER_DURATA: Record<Risposte['durataMin'], number> = { 30: 4, 45: 5, 60: 6, 75: 7 }

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
    // per forza e massa i principali sono i fondamentali, non gli esercizi esplosivi
    if (slot.ruolo === 'principale' && ['forza', 'massa'].includes(r.obiettivi[0]) && e.categoria === 'forza') {
      s += 2
      if (e.attrezzi.some((g) => g.includes('bilanciere') || g.includes('trap-bar'))) s += 1
    }
    if (e.categoria === 'potenza' && !r.obiettivi.includes('potenza')) s -= 1.5
    if (e.impatto) s -= 1
    s -= Math.abs(e.livello - r.livello) * 0.5
    for (const fo of r.focus) if (e.schemi.some((x) => FOCUS_SCHEMI[fo].includes(x))) s += 1
    if (r.focus.includes('catena-posteriore') && (espandi(e.muscoli).lombari ?? 0) >= 2) s += 1
    if (r.focus.includes('schiena-spalle') && (espandi(e.muscoli)['deltoide-posteriore'] ?? 0) >= 2) s += 1
    if (r.obiettivi[0] === 'potenza' && (e.schemi.includes('balistico') || e.schemi.includes('pliometria'))) s += 1
    s -= (this.usati.get(e.id) ?? 0) * 4
    return s
  }

  scegli(slot: Slot, esclusi: Set<string>, categorie = PALESTRA_CATEGORIE): Esercizio | null {
    const candidati = esercizi.filter((e) => categorie.has(e.categoria) && !esclusi.has(e.id) && e.schemi.some((s) => slot.schemi.includes(s)) && disponibile(e, this.r))
    if (!candidati.length) return null
    const migliore = candidati.map((e) => ({ e, p: this.punteggio(e, slot) })).sort((a, b) => b.p - a.p || a.e.id.localeCompare(b.e.id))[0].e
    this.usati.set(migliore.id, (this.usati.get(migliore.id) ?? 0) + 1)
    return migliore
  }

  /** Scelta per muscoli: esercizi di allungamento/mobilita' per i muscoli piu' usati nella seduta. */
  scegliRecupero(muscoliSeduta: Record<string, number>, n: number, categorie: string[], esclusi: Set<string>): Esercizio[] {
    const out: Esercizio[] = []
    const cand = esercizi
      .filter((e) => categorie.includes(e.categoria) && disponibile(e, this.r) && !esclusi.has(e.id))
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
  const sedute: Record<string, Seduta> = {}
  const settimana: Programma['settimana'] = []

  const ms = modelli(giorni.length)
  giorni.forEach((giorno, i) => {
    const id = `s${i + 1}`
    const modello = soloMobilita && i % 2 === 1 ? null : ms[i % ms.length]
    const esclusi = new Set<string>()
    const palestra: VocePalestra[] = []
    const muscoliSeduta: Record<string, number> = {}
    const aggiungi = (p: Prescrizione) => {
      palestra.push(p)
      esclusi.add(p.esercizioId)
      const es = esercizi.find((e) => e.id === p.esercizioId)!
      for (const [k, v] of Object.entries(espandi(es.muscoli))) muscoliSeduta[k] = Math.max(muscoliSeduta[k] ?? 0, v)
    }

    if (modello) {
      // la potenza apre la seduta con un esercizio esplosivo
      if (r.obiettivi.includes('potenza') && modello !== COND) {
        const e = sel.scegli(A('pliometria', 'balistico'), esclusi, new Set(['potenza']))
        if (e) aggiungi(prescrivi(e, 'potenza', 'accessorio', r.livello))
      }
      // esplosivi in apertura e circuito finale occupano il posto di un esercizio ciascuno
      const conCircuito = r.obiettivi.includes('resistenza') && modello !== COND && r.durataMin >= 45
      const posti = Math.max(3, nSlot - palestra.length - (conCircuito ? 1 : 0))
      for (const slot of modello.slot.slice(0, posti)) {
        const e = sel.scegli(slot, esclusi)
        if (!e) continue
        aggiungi(prescrivi(e, slot.ruolo === 'principale' ? primario : secondario, slot.ruolo, r.livello))
      }
      // la resistenza chiude con un circuito
      if (conCircuito) {
        const scelti = [A('balistico', 'locomozione'), A('anti-estensione', 'anti-rotazione'), A('trasporto', 'cardio')]
          .map((s) => sel.scegli(s, esclusi))
          .filter((e): e is Esercizio => !!e)
        if (scelti.length >= 2) {
          scelti.forEach((e) => esclusi.add(e.id))
          const c: Circuito = { circuito: true, giri: r.livello === 1 ? 3 : 4, lavoroSec: 40, pausaSec: 20, esercizi: scelti.map((e) => e.id) }
          palestra.push(c)
        }
      }
    }

    // defaticamento: mobilita', stretching e yoga per i muscoli usati
    const quanti = soloMobilita ? 7 : r.obiettivi.includes('mobilita') ? 4 : 2
    const categorie = soloMobilita || r.obiettivi.includes('mobilita') ? ['stretching', 'yoga', 'mobilita'] : ['stretching', 'mobilita']
    const recupero = sel.scegliRecupero(Object.keys(muscoliSeduta).length ? muscoliSeduta : { 'erettori-spinali': 2, femorali: 2, 'grande-gluteo': 2 }, quanti, categorie, esclusi)
    const mobilita = recupero.map((e) => prescrivi(e, 'mobilita', 'accessorio', r.livello)).map((p) => ({ ...p, serie: p.serie && p.serie > 2 ? 2 : p.serie, recuperoSec: undefined }))

    const nome = modello ? (soloMobilita ? 'Forza e controllo' : modello.nome) : 'Mobilità e yoga'
    const seduta: Seduta = { nome, palestra, mobilita, core: !!modello && r.durataMin >= 45 }
    // corsa: Zona 2 nella prima seduta, lavoro di qualita' in una seduta a meta' settimana
    if (r.corsa) {
      const n = giorni.length
      if (i === 0) seduta.pista = PISTE.zona2
      else if (n >= 3 && i === Math.floor(n / 2)) seduta.pista = r.obiettivi.includes('potenza') ? PISTE.sprint : r.obiettivi.includes('resistenza') ? PISTE.soglia : PISTE.intervalli
    }
    sedute[id] = seduta
    settimana.push({ giorno, sedutaId: id })
  })

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

  return { settimana, fasi: fasiPer(primario), blocco_core, sedute }
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
  corsa: false,
  evitare: [],
  focus: [],
}
