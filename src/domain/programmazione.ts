/**
 * Principi di programmazione applicati alle schede generate:
 * - volume settimanale per gruppo muscolare (serie dirette), con intervalli per obiettivo e livello;
 * - equilibrio tra spinte e tirate;
 * - ordine degli esercizi (esplosivi, fondamentali, complementari, isolamento, trasporti, core);
 * - superserie per antagonisti o per distretti non in competizione;
 * - riscaldamento specifico per il lavoro del giorno.
 */
import { esercizi, esercizio } from './data'
import { espandi, type MuscoloId } from './muscles'
import { isCircuito, type Esercizio, type Obiettivo, type Prescrizione, type Programma, type VocePalestra } from './types'

// ---------- gruppi muscolari ----------

export const GRUPPI = {
  petto: { nome: 'Petto', muscoli: ['pettorale-alto', 'pettorale-basso'] },
  schiena: { nome: 'Schiena', muscoli: ['gran-dorsale', 'trapezio-medio', 'trapezio-basso'] },
  spalle: { nome: 'Spalle', muscoli: ['deltoide-anteriore', 'deltoide-posteriore'] },
  bicipiti: { nome: 'Bicipiti', muscoli: ['bicipite'] },
  tricipiti: { nome: 'Tricipiti', muscoli: ['tricipite'] },
  quadricipiti: { nome: 'Quadricipiti', muscoli: ['retto-femorale', 'vasto-laterale', 'vasto-mediale'] },
  femorali: { nome: 'Femorali', muscoli: ['bicipite-femorale', 'semitendinoso'] },
  glutei: { nome: 'Glutei', muscoli: ['grande-gluteo', 'medio-gluteo'] },
  polpacci: { nome: 'Polpacci', muscoli: ['gastrocnemio-laterale', 'gastrocnemio-mediale', 'soleo'] },
  core: { nome: 'Core', muscoli: ['retto-addominale', 'obliqui'] },
} satisfies Record<string, { nome: string; muscoli: MuscoloId[] }>

export type Gruppo = keyof typeof GRUPPI
export const ELENCO_GRUPPI = Object.keys(GRUPPI) as Gruppo[]

/** Contributo di un esercizio a ogni gruppo: 1 se un muscolo del gruppo e' primario, 0,5 se secondario. */
export function contributo(e: Esercizio): Partial<Record<Gruppo, number>> {
  const m = espandi(e.muscoli)
  const out: Partial<Record<Gruppo, number>> = {}
  for (const g of ELENCO_GRUPPI) {
    const lv = Math.max(0, ...GRUPPI[g].muscoli.map((x) => m[x as MuscoloId] ?? 0))
    if (lv >= 3) out[g] = 1
    else if (lv === 2) out[g] = 0.5
  }
  return out
}

/** Serie settimanali per gruppo (serie dirette), dal lavoro di palestra e dai circuiti. */
export function volumeSettimanaleGruppi(p: Programma): Record<Gruppo, number> {
  const out = Object.fromEntries(ELENCO_GRUPPI.map((g) => [g, 0])) as Record<Gruppo, number>
  const volte = new Map<string, number>()
  for (const { sedutaId } of p.settimana) volte.set(sedutaId, (volte.get(sedutaId) ?? 0) + 1)
  for (const [id, n] of volte) {
    const s = p.sedute[id]
    if (!s) continue
    for (const v of s.palestra ?? []) {
      const voci = isCircuito(v) ? v.esercizi.map((x) => ({ id: x, serie: v.giri })) : [{ id: v.esercizioId, serie: v.serie ?? 1 }]
      for (const { id: eid, serie } of voci) {
        for (const [g, c] of Object.entries(contributo(esercizio(eid))) as [Gruppo, number][]) out[g] += c * serie * n
      }
    }
  }
  return out
}

/**
 * Intervalli di serie settimanali per gruppo, per obiettivo e livello (principiante, intermedio, avanzato).
 * Ordini di grandezza dalla letteratura su volume e ipertrofia/forza: si parte bassi e si sale con l'esperienza.
 */
export function volumeTarget(obiettivo: Obiettivo, livello: 1 | 2 | 3): [number, number] {
  const t: Record<Obiettivo, [number, number][]> = {
    massa: [[8, 12], [10, 16], [12, 20]],
    forza: [[6, 10], [8, 12], [10, 15]],
    potenza: [[6, 10], [8, 12], [8, 12]],
    resistenza: [[6, 10], [8, 12], [10, 14]],
    stabilita: [[6, 10], [8, 12], [8, 12]],
    mobilita: [[4, 8], [6, 10], [6, 10]],
  }
  return t[obiettivo][livello - 1]
}

const MAX_SERIE = { principale: 5, accessorio: 4 }

/**
 * Porta ogni gruppo allenato dentro l'intervallo di volume variando le serie degli esercizi
 * (prima gli esercizi dedicati al gruppo) e garantisce che la schiena non abbia meno serie del petto.
 * I gruppi non allenati dalla scheda non vengono toccati.
 */
/** I piccoli distretti ricevono gia' lavoro indiretto dai multiarticolari: intervalli piu' bassi. Il core ha il suo blocco. */
/** Quota del volume indicato per i gruppi piccoli, gia' allenati dai multiarticolari; il core si allena a parte. */
export const FATTORE_GRUPPO: Record<Gruppo, number> = { petto: 1, schiena: 1, spalle: 1, quadricipiti: 1, femorali: 1, glutei: 1, bicipiti: 0.6, tricipiti: 0.6, polpacci: 0.6, core: 0 }

export function bilanciaVolume(p: Programma, obiettivo: Obiettivo, livello: 1 | 2 | 3, principali: Set<Prescrizione>): Programma {
  const [minBase, maxBase] = volumeTarget(obiettivo, livello)
  const voci = (): { p: Prescrizione; n: number }[] => {
    const volte = new Map<string, number>()
    for (const { sedutaId } of p.settimana) volte.set(sedutaId, (volte.get(sedutaId) ?? 0) + 1)
    return [...volte].flatMap(([id, n]) => (p.sedute[id]?.palestra ?? []).filter((v): v is Prescrizione => !isCircuito(v) && v.serie !== undefined).map((x) => ({ p: x, n })))
  }
  const dedicati = (g: Gruppo) =>
    voci()
      .filter(({ p: x }) => contributo(esercizio(x.esercizioId))[g] === 1)
      .sort((a, b) => Object.keys(contributo(esercizio(a.p.esercizioId))).length - Object.keys(contributo(esercizio(b.p.esercizioId))).length)
  const tetto = (x: Prescrizione) => (principali.has(x) ? MAX_SERIE.principale : MAX_SERIE.accessorio)

  for (let giro = 0; giro < 40; giro++) {
    const vol = volumeSettimanaleGruppi(p)
    let cambiato = false
    for (const g of ELENCO_GRUPPI) {
      if (vol[g] === 0 || FATTORE_GRUPPO[g] === 0) continue
      const min = Math.round(minBase * FATTORE_GRUPPO[g])
      const max = Math.round(maxBase * FATTORE_GRUPPO[g])
      if (vol[g] < min) {
        const d = dedicati(g).filter(({ p: x }) => (x.serie ?? 0) < tetto(x)).sort((a, b) => (a.p.serie ?? 0) - (b.p.serie ?? 0))[0]
        if (d) {
          d.p.serie = (d.p.serie ?? 0) + 1
          cambiato = true
        }
      } else if (vol[g] > max) {
        // si tolgono serie ai complementari (i fondamentali restano come prescritti)
        const d = dedicati(g).filter(({ p: x }) => (x.serie ?? 0) > 2 && !principali.has(x)).sort((a, b) => (b.p.serie ?? 0) - (a.p.serie ?? 0))[0]
        if (d) {
          d.p.serie = (d.p.serie ?? 0) - 1
          cambiato = true
        }
      }
    }
    // equilibrio spinta/tirata: la schiena almeno quanto il petto
    const v2 = volumeSettimanaleGruppi(p)
    if (v2.petto > 0 && v2.schiena < v2.petto) {
      const d = dedicati('schiena').filter(({ p: x }) => (x.serie ?? 0) < tetto(x)).sort((a, b) => (a.p.serie ?? 0) - (b.p.serie ?? 0))[0]
      if (d) {
        d.p.serie = (d.p.serie ?? 0) + 1
        cambiato = true
      }
    }
    if (!cambiato) break
  }
  return p
}

// ---------- ordine degli esercizi ----------

/** Priorita' nella seduta: prima cio' che richiede piu' freschezza neuromuscolare. */
export function priorita(e: Esercizio, principale: boolean): number {
  if (e.schemi.includes('pliometria') || e.schemi.includes('balistico')) return 0
  if (principale) return 1
  if (e.schemi.includes('isolamento')) return 3
  if (e.schemi.includes('trasporto')) return 4
  if (e.schemi.every((s) => s.startsWith('anti-') || s === 'rotazione' || s === 'locomozione')) return 5
  if (e.schemi.some((s) => ['polpacci', 'ginocchio', 'scapole'].includes(s))) return 3
  return 2
}

// ---------- superserie ----------

type Lato = 'spinta' | 'tirata' | 'gambe-ant' | 'gambe-post' | 'bicipiti' | 'tricipiti' | 'core' | 'altro'

function distretto(e: Esercizio): Lato {
  const m = espandi(e.muscoli)
  const p = (ids: MuscoloId[]) => ids.some((x) => m[x] === 3)
  if (p(['bicipite']) && !p(['gran-dorsale'])) return 'bicipiti'
  if (p(['tricipite']) && !p(['pettorale-alto', 'pettorale-basso'])) return 'tricipiti'
  if (p(['pettorale-alto', 'pettorale-basso', 'deltoide-anteriore'])) return 'spinta'
  if (p(['gran-dorsale', 'trapezio-medio', 'trapezio-basso', 'deltoide-posteriore'])) return 'tirata'
  if (p(['retto-femorale', 'vasto-laterale', 'vasto-mediale', 'adduttori'])) return 'gambe-ant'
  if (p(['bicipite-femorale', 'semitendinoso', 'grande-gluteo', 'medio-gluteo', 'gastrocnemio-laterale', 'gastrocnemio-mediale', 'soleo'])) return 'gambe-post'
  if (p(['retto-addominale', 'obliqui'])) return 'core'
  return 'altro'
}

const ANTAGONISTI: [Lato, Lato][] = [
  ['spinta', 'tirata'],
  ['gambe-ant', 'gambe-post'],
  ['bicipiti', 'tricipiti'],
]
const SUPERIORE = new Set<Lato>(['spinta', 'tirata', 'bicipiti', 'tricipiti'])
const INFERIORE = new Set<Lato>(['gambe-ant', 'gambe-post'])

/** Qualita' di una coppia: antagonisti 3, superiore+inferiore o con il core 2, distretti diversi 1, stesso 0. */
export function affinitaSuperserie(a: Esercizio, b: Esercizio): number {
  const x = distretto(a)
  const y = distretto(b)
  if (ANTAGONISTI.some(([p, q]) => (x === p && y === q) || (x === q && y === p))) return 3
  if ((SUPERIORE.has(x) && INFERIORE.has(y)) || (INFERIORE.has(x) && SUPERIORE.has(y)) || x === 'core' || y === 'core') return 2
  return x === y ? 0 : 1
}

/**
 * Crea le superserie: `tutte` accoppia tutti gli esercizi (fondamentali compresi), `alcune` crea al
 * massimo `coppie` coppie fra i complementari. Gli esercizi accoppiati diventano adiacenti; il primo
 * della coppia non ha recupero, il secondo tiene il recupero piu' lungo dei due.
 */
export function creaSuperserie(voci: VocePalestra[], modo: 'tutte' | 'alcune', coppie: number, principali: Set<Prescrizione>): VocePalestra[] {
  const lista = voci.filter((v): v is Prescrizione => !isCircuito(v))
  const circuiti = voci.filter(isCircuito)
  const candidabili = lista.filter((v) => modo === 'tutte' || (!principali.has(v) && !esercizio(v.esercizioId).schemi.includes('pliometria')))
  const libere = new Set(candidabili)
  const coppieFatte: [Prescrizione, Prescrizione][] = []
  const massimo = modo === 'tutte' ? Infinity : coppie
  for (const a of candidabili) {
    if (coppieFatte.length >= massimo) break
    if (!libere.has(a)) continue
    libere.delete(a)
    const partner = [...libere].map((b) => ({ b, s: affinitaSuperserie(esercizio(a.esercizioId), esercizio(b.esercizioId)) })).sort((x, y) => y.s - x.s)[0]
    if (!partner || (modo === 'alcune' && partner.s < 1)) continue
    libere.delete(partner.b)
    coppieFatte.push([a, partner.b])
  }
  const lettere = 'ABCDEFGHIJKLMNOP'
  const inCoppia = new Map<Prescrizione, [Prescrizione, Prescrizione, string]>()
  coppieFatte.forEach(([a, b], i) => {
    const l = lettere[i]
    inCoppia.set(a, [a, b, l])
    inCoppia.set(b, [a, b, l])
  })
  const out: VocePalestra[] = []
  const messi = new Set<Prescrizione>()
  for (const v of lista) {
    if (messi.has(v)) continue
    const c = inCoppia.get(v)
    if (!c) {
      out.push(v)
      messi.add(v)
      continue
    }
    const [a, b, l] = c
    const rec = Math.max(a.recuperoSec ?? 0, b.recuperoSec ?? 0)
    out.push({ ...a, superserie: l, recuperoSec: 0 }, { ...b, superserie: l, recuperoSec: rec })
    messi.add(a)
    messi.add(b)
    // i principali restano riconoscibili anche dopo la copia
    if (principali.has(a)) principali.add(out.at(-2) as Prescrizione)
    if (principali.has(b)) principali.add(out.at(-1) as Prescrizione)
  }
  return [...out, ...circuiti]
}

// ---------- riscaldamento ----------

const ATTIVAZIONE_INFERIORE = ['ponte_glutei', 'bird_dog', 'equilibrio_monopodalico', 'dead_bug']
const ATTIVAZIONE_SUPERIORE = ['band_pull_apart', 'rotazioni_esterne_elastico', 'ytw_prono', 'face_pull']
const MOBILITA_INFERIORE = ['anche_90_90', 'ginocchio_muro', 'cat_cow']
const MOBILITA_SUPERIORE = ['open_book', 'cat_cow', 'stretch_laterale']

/**
 * Riscaldamento specifico: una o due mobilita' per le articolazioni del giorno e una o due
 * attivazioni leggere dei muscoli stabilizzatori, a basso carico.
 */
export function riscaldamentoPer(voci: VocePalestra[], disponibile: (e: Esercizio) => boolean, esclusi: Set<string>, massimo = 4): Prescrizione[] {
  let sup = 0
  let inf = 0
  for (const v of voci) {
    for (const id of isCircuito(v) ? v.esercizi : [v.esercizioId]) {
      const d = distretto(esercizio(id))
      if (SUPERIORE.has(d)) sup++
      if (INFERIORE.has(d)) inf++
    }
  }
  const scegli = (ids: string[], n: number) =>
    ids
      .map((id) => esercizi.find((e) => e.id === id))
      .filter((e): e is Esercizio => !!e && disponibile(e) && !esclusi.has(e.id))
      .slice(0, n)
  const entrambi = sup > 0 && inf > 0
  const mob = [...(inf ? scegli(MOBILITA_INFERIORE, entrambi ? 1 : 2) : []), ...(sup ? scegli(MOBILITA_SUPERIORE.filter((x) => !(inf && x === 'cat_cow')), entrambi ? 1 : 1) : [])]
  const att = [...(inf ? scegli(ATTIVAZIONE_INFERIORE, 1) : []), ...(sup ? scegli(ATTIVAZIONE_SUPERIORE, 1) : [])]
  const lista = [...mob, ...att].length ? [...mob, ...att] : scegli(['cat_cow', 'dead_bug'], 2)
  return lista.slice(0, massimo).map((e) =>
    e.tipoRegistrazione === 'tempo'
      ? { esercizioId: e.id, serie: 1, durataSec: /lato/.test(e.esecuzione.join(' ')) ? '30 per lato' : 30 }
      : { esercizioId: e.id, serie: att.includes(e) ? 2 : 1, ripetizioni: '10' },
  )
}

// ---------- riepilogo modificabile e carico per muscolo ----------

const SERIE_MIN = 1
const SERIE_MAX = 6

/**
 * Esercizi che lavorano il gruppo, con il contributo (1 primario, 0,5 secondario) e quante volte a settimana
 * compare la seduta. Se ci sono esercizi dedicati si usano solo quelli.
 */
function vociDedicate(p: Programma, g: Gruppo): { v: Prescrizione; n: number; c: number }[] {
  const volte = new Map<string, number>()
  for (const { sedutaId } of p.settimana) volte.set(sedutaId, (volte.get(sedutaId) ?? 0) + 1)
  const tutte = [...volte].flatMap(([id, n]) =>
    (p.sedute[id]?.palestra ?? [])
      .filter((v): v is Prescrizione => !isCircuito(v) && v.serie !== undefined)
      .map((v) => ({ v, n, c: contributo(esercizio(v.esercizioId))[g] ?? 0 }))
      .filter((x) => x.c > 0),
  )
  const dedicate = tutte.filter((x) => x.c === 1)
  return dedicate.length ? dedicate : tutte
}

/** Serie settimanali raggiungibili per un gruppo cambiando solo le serie dei suoi esercizi (da 1 a 6). */
export function limitiVolumeGruppo(p: Programma, g: Gruppo): [number, number] {
  const vol = volumeSettimanaleGruppi(p)[g]
  const ded = vociDedicate(p, g)
  const giu = ded.reduce((t, { v, n, c }) => t + ((v.serie ?? 0) - SERIE_MIN) * n * c, 0)
  const su = ded.reduce((t, { v, n, c }) => t + (SERIE_MAX - (v.serie ?? 0)) * n * c, 0)
  return [Math.max(0, vol - giu), vol + su]
}

/**
 * Porta il volume di un gruppo vicino a `obiettivo` aggiungendo o togliendo una serie alla volta.
 * Si toccano prima gli esercizi piu' specifici (isolamento), cosi' gli altri gruppi cambiano il meno possibile.
 */
export function impostaVolumeGruppo(p: Programma, g: Gruppo, obiettivo: number): Programma {
  const out = clonaProgramma(p)
  for (let giro = 0; giro < 200; giro++) {
    const diff = obiettivo - volumeSettimanaleGruppi(out)[g]
    if (Math.abs(diff) < 0.25) break
    const su = diff > 0
    const specifici = (x: { v: Prescrizione }) => Object.keys(contributo(esercizio(x.v.esercizioId))).length
    const scelta = vociDedicate(out, g)
      .filter(({ v }) => (su ? (v.serie ?? 0) < SERIE_MAX : (v.serie ?? 0) > SERIE_MIN))
      .sort((a, b) => specifici(a) - specifici(b) || (su ? (a.v.serie ?? 0) - (b.v.serie ?? 0) : (b.v.serie ?? 0) - (a.v.serie ?? 0)))[0]
    // ci si ferma se il passo successivo allontanerebbe dal valore scelto
    if (!scelta || Math.abs(diff) < (scelta.n * scelta.c) / 2) break
    scelta.v.serie = (scelta.v.serie ?? 0) + (su ? 1 : -1)
  }
  return out
}

const clonaProgramma = (p: Programma): Programma => JSON.parse(JSON.stringify(p)) as Programma

const PESO_LIVELLO: Record<number, number> = { 3: 1, 2: 0.5, 1: 0 }

/**
 * Carico settimanale per muscolo: serie x coinvolgimento (primario 1, secondario 0,5), da palestra,
 * circuiti e blocco core (le due varianti si alternano, quindi meta' ciascuna).
 */
export function caricoMuscoli(p: Programma): Partial<Record<MuscoloId, number>> {
  const out: Partial<Record<MuscoloId, number>> = {}
  const somma = (id: string, serie: number) => {
    for (const [m, l] of Object.entries(espandi(esercizio(id).muscoli)) as [MuscoloId, number][]) {
      const w = PESO_LIVELLO[l] ?? 0
      if (w) out[m] = (out[m] ?? 0) + serie * w
    }
  }
  for (const { sedutaId } of p.settimana) {
    const s = p.sedute[sedutaId]
    if (!s) continue
    for (const v of s.palestra ?? []) {
      if (isCircuito(v)) v.esercizi.forEach((id) => somma(id, v.giri))
      else somma(v.esercizioId, v.serie ?? 1)
    }
    if (s.core) for (const v of [...p.blocco_core.varianteA, ...p.blocco_core.varianteB]) somma(v.esercizioId, (v.serie ?? 1) / 2)
  }
  return out
}
