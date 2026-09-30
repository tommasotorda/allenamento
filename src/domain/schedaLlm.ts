/**
 * Scheda scritta da un LLM: modello da dare all'assistente (istruzioni, formato, esercizi disponibili,
 * esempio) e importazione con controllo di ogni campo. Il formato e' volutamente piu' semplice del
 * Programma interno: sedute in ordine, giorni, e per ogni esercizio l'id del catalogo.
 */
import { esercizi, GIORNI } from './data'
import { fasiPer, NOMI_ATTREZZI, NOMI_OBIETTIVI } from './generator'
import { espandi, MUSCOLI } from './muscles'
import type { Esercizio, GiornoId, Obiettivo, Prescrizione, Programma, Seduta, TipoRegistrazione, VocePalestra } from './types'

export const FORMATO = 'allenamento/scheda@1'

const OBIETTIVI = Object.keys(NOMI_OBIETTIVI) as Obiettivo[]

// ---------- formato ----------

export interface VoceLlm {
  esercizio: string
  serie: number
  ripetizioni?: string | number
  durataSec?: number | string
  distanzaM?: number
  recuperoSec?: number
  superserie?: string
}

export interface CircuitoLlm {
  circuito: string[]
  giri: number
  lavoroSec: number
  pausaSec: number
}

export interface SedutaLlm {
  nome: string
  giorni: GiornoId[]
  riscaldamento?: VoceLlm[]
  esercizi: (VoceLlm | CircuitoLlm)[]
  defaticamento?: VoceLlm[]
}

export interface SchedaLlm {
  formato: typeof FORMATO
  nome: string
  obiettivi: Obiettivo[]
  sedute: SedutaLlm[]
}

const MISURA: Record<Exclude<TipoRegistrazione, 'pista'>, { campo: 'ripetizioni' | 'durataSec' | 'distanzaM'; testo: string }> = {
  carico_ripetizioni: { campo: 'ripetizioni', testo: 'carico e ripetizioni' },
  ripetizioni: { campo: 'ripetizioni', testo: 'ripetizioni' },
  tempo: { campo: 'durataSec', testo: 'tempo (secondi)' },
  distanza: { campo: 'distanzaM', testo: 'distanza (metri)' },
}

/** Esercizi utilizzabili in una scheda importata: la pista ha un suo blocco e non si importa. */
const catalogo = () => esercizi.filter((e) => e.tipoRegistrazione !== 'pista')

const ESEMPIO: SchedaLlm = {
  formato: FORMATO,
  nome: 'Esempio: forza 2 giorni',
  obiettivi: ['forza'],
  sedute: [
    {
      nome: 'Total body A',
      giorni: ['lun'],
      riscaldamento: [{ esercizio: 'cat_cow', serie: 1, ripetizioni: 10 }],
      esercizi: [
        { esercizio: 'goblet_squat', serie: 4, ripetizioni: '6-8', recuperoSec: 120 },
        { esercizio: 'push_up', serie: 3, ripetizioni: '8-12', recuperoSec: 0, superserie: 'A' },
        { esercizio: 'rematore_manubrio', serie: 3, ripetizioni: '8-12', recuperoSec: 90, superserie: 'A' },
        { esercizio: 'plank', serie: 3, durataSec: 30, recuperoSec: 45 },
      ],
      defaticamento: [{ esercizio: 'stretch_laterale', serie: 1, durataSec: 30 }],
    },
    {
      nome: 'Total body B',
      giorni: ['gio'],
      esercizi: [
        { esercizio: 'stacco_rumeno_manubri', serie: 4, ripetizioni: '6-8', recuperoSec: 120 },
        { esercizio: 'affondo_indietro', serie: 3, ripetizioni: '8 per lato', recuperoSec: 90 },
        { circuito: ['kettlebell_swing', 'dead_bug'], giri: 3, lavoroSec: 30, pausaSec: 15 },
      ],
    },
  ],
}

/** Modello da consegnare all'LLM: tutto cio' che serve per rispondere nel formato giusto. */
export function modelloPerLlm() {
  const muscoliPrimari = (e: Esercizio) =>
    Object.entries(espandi(e.muscoli))
      .filter(([, l]) => l === 3)
      .map(([m]) => MUSCOLI[m as keyof typeof MUSCOLI].nome)
  return {
    istruzioni: [
      "Crea una scheda di allenamento e rispondi SOLO con un oggetto JSON nel formato descritto in 'formato', senza testo prima o dopo.",
      "Usa esclusivamente esercizi dell'elenco 'esercizi', indicandoli con il loro 'id' esatto.",
      "Ogni esercizio ha una 'misura': 'carico e ripetizioni' e 'ripetizioni' vogliono 'ripetizioni', 'tempo (secondi)' vuole 'durataSec', 'distanza (metri)' vuole 'distanzaM'.",
      "Superserie: stessa lettera (A, B...) su esercizi consecutivi; recuperoSec 0 su tutti tranne l'ultimo della superserie.",
      "Ogni giorno della settimana puo' comparire in una sola seduta.",
      "Chiedi all'utente obiettivi, giorni, durata e attrezzi disponibili se non li conosci, e scegli esercizi compatibili con gli attrezzi.",
      "La scheda dura 12 settimane con progressione automatica: indica le prescrizioni della settimana tipo.",
    ],
    formato: {
      formato: `sempre "${FORMATO}"`,
      nome: 'nome della scheda',
      obiettivi: `da 1 a 3, in ordine di priorita', tra: ${OBIETTIVI.join(', ')}`,
      sedute: [
        {
          nome: 'nome della seduta',
          giorni: `uno o piu' giorni tra: ${GIORNI.join(', ')}`,
          riscaldamento: '(facoltativo) elenco di esercizi',
          esercizi: 'elenco di esercizi o circuiti (almeno uno)',
          defaticamento: '(facoltativo) elenco di esercizi',
        },
      ],
      esercizio: {
        esercizio: "id dall'elenco",
        serie: 'intero da 1 a 10',
        ripetizioni: '"8", "6-8" o "8 per lato" (se la misura lo prevede)',
        durataSec: 'secondi, anche "30 per lato" (se la misura e\' il tempo)',
        distanzaM: 'metri (se la misura e\' la distanza)',
        recuperoSec: '(facoltativo) secondi di recupero dopo ogni serie',
        superserie: '(facoltativo) lettera del gruppo, es. "A"',
      },
      circuito: { circuito: 'elenco di id', giri: 'intero da 1 a 10', lavoroSec: 'secondi di lavoro per esercizio', pausaSec: 'secondi di pausa' },
    },
    esercizi: catalogo().map((e) => ({
      id: e.id,
      nome: e.nome,
      categoria: e.categoria,
      misura: MISURA[e.tipoRegistrazione as keyof typeof MISURA].testo,
      attrezzi: e.attrezzi.length ? e.attrezzi.map((g) => g.map((a) => NOMI_ATTREZZI[a]).join(' o ')).join(' + ') : 'corpo libero',
      livello: e.livello,
      muscoli: muscoliPrimari(e).join(', '),
    })),
    esempio: ESEMPIO,
  }
}

// ---------- importazione ----------

export type RisultatoImport = { ok: true; nome: string; obiettivi: Obiettivo[]; programma: Programma } | { ok: false; errori: string[] }

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

function distanza(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prec = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1))
      prec = t
    }
  }
  return d[b.length]
}

/** Esercizi con id o nome simile, per suggerire la correzione. */
function simili(testo: string): Esercizio[] {
  const n = norm(testo)
  return catalogo()
    .map((e) => ({ e, d: Math.min(distanza(n, e.id), distanza(n, norm(e.nome))) - (e.id.includes(n) || n.includes(e.id) ? 3 : 0) }))
    .filter((x) => x.d <= Math.max(3, n.length / 3))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => x.e)
}

/** Estrae l'oggetto JSON anche se l'LLM l'ha messo in un blocco di codice o con testo attorno. */
function estraiJson(testo: string): { valore?: unknown; errore?: string } {
  const t = testo.trim()
  if (!t) return { errore: 'Il testo e\' vuoto: incolla la risposta dell\'assistente o scegli un file.' }
  const inizio = t.indexOf('{')
  const fine = t.lastIndexOf('}')
  if (inizio < 0 || fine < inizio) return { errore: 'Non trovo un oggetto JSON: la risposta deve contenere un oggetto tra parentesi graffe { }.' }
  try {
    return { valore: JSON.parse(t.slice(inizio, fine + 1)) }
  } catch (e) {
    return { errore: `Il JSON non e' valido: ${(e as Error).message}. Controlla virgole, virgolette e parentesi, oppure chiedi all'assistente di correggerlo.` }
  }
}

const eOggetto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const intero = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max
const RE_RIP = /^\d+(-\d+)?( per lato)?$/
const RE_DURATA = /^\d+( per lato)?$/
const CHIAVI_VOCE = new Set(['esercizio', 'serie', 'ripetizioni', 'durataSec', 'distanzaM', 'recuperoSec', 'superserie'])
const CHIAVI_CIRCUITO = new Set(['circuito', 'giri', 'lavoroSec', 'pausaSec'])
const CHIAVI_SEDUTA = new Set(['nome', 'giorni', 'riscaldamento', 'esercizi', 'defaticamento'])

/** Controlla la scheda e la converte nel programma interno; in caso di problemi li elenca tutti. */
export function importaSchedaLlm(testo: string): RisultatoImport {
  const { valore, errore } = estraiJson(testo)
  if (errore) return { ok: false, errori: [errore] }
  const errori: string[] = []
  if (!eOggetto(valore)) return { ok: false, errori: ['Il JSON deve essere un oggetto con "nome", "obiettivi" e "sedute".'] }
  const x = valore

  if (x.formato !== undefined && x.formato !== FORMATO) errori.push(`"formato" deve essere "${FORMATO}" (trovato ${JSON.stringify(x.formato)}).`)
  const nome = typeof x.nome === 'string' && x.nome.trim() ? x.nome.trim() : null
  if (!nome) errori.push('Manca "nome": il nome della scheda.')

  let obiettivi: Obiettivo[] = []
  if (!Array.isArray(x.obiettivi) || !x.obiettivi.length) errori.push(`Manca "obiettivi": da 1 a 3 tra ${OBIETTIVI.join(', ')}.`)
  else {
    const sbagliati = x.obiettivi.filter((o) => !OBIETTIVI.includes(o as Obiettivo))
    if (sbagliati.length) errori.push(`Obiettivi non riconosciuti: ${sbagliati.map((o) => JSON.stringify(o)).join(', ')}. Valori ammessi: ${OBIETTIVI.join(', ')}.`)
    else if (x.obiettivi.length > 3) errori.push('"obiettivi": al massimo 3.')
    else obiettivi = [...new Set(x.obiettivi as Obiettivo[])]
  }

  const sedute: Record<string, Seduta> = {}
  const settimana: Programma['settimana'] = []
  const giorniUsati = new Map<GiornoId, string>()

  if (!Array.isArray(x.sedute) || !x.sedute.length) errori.push('Manca "sedute": almeno una seduta.')
  else
    x.sedute.forEach((s, i) => {
      const dove = `Seduta ${i + 1}${eOggetto(s) && typeof s.nome === 'string' ? ` «${s.nome}»` : ''}`
      if (!eOggetto(s)) return errori.push(`${dove}: deve essere un oggetto.`)
      const extra = Object.keys(s).filter((k) => !CHIAVI_SEDUTA.has(k))
      if (extra.length) errori.push(`${dove}: campi non previsti ${extra.map((k) => `"${k}"`).join(', ')}. Ammessi: ${[...CHIAVI_SEDUTA].join(', ')}.`)
      if (typeof s.nome !== 'string' || !s.nome.trim()) errori.push(`${dove}: manca "nome".`)

      const giorni: GiornoId[] = []
      if (!Array.isArray(s.giorni) || !s.giorni.length) errori.push(`${dove}: "giorni" deve elencare almeno un giorno tra ${GIORNI.join(', ')}.`)
      else
        for (const g of s.giorni) {
          if (!GIORNI.includes(g as GiornoId)) errori.push(`${dove}: giorno ${JSON.stringify(g)} non valido. Usa ${GIORNI.join(', ')}.`)
          else if (giorniUsati.has(g as GiornoId)) errori.push(`${dove}: il giorno "${g}" e' gia' assegnato a ${giorniUsati.get(g as GiornoId)}.`)
          else {
            giorniUsati.set(g as GiornoId, dove)
            giorni.push(g as GiornoId)
          }
        }

      const blocco = (campo: 'riscaldamento' | 'esercizi' | 'defaticamento', obbligatorio: boolean, circuiti: boolean): VocePalestra[] => {
        const lista = s[campo]
        if (lista === undefined && !obbligatorio) return []
        if (!Array.isArray(lista) || (obbligatorio && !lista.length)) {
          errori.push(`${dove}: "${campo}" deve essere un elenco${obbligatorio ? ' con almeno un esercizio' : ''}.`)
          return []
        }
        const voci = lista.flatMap((v, k) => {
          const r = circuiti && eOggetto(v) && 'circuito' in v ? leggiCircuito(v, `${dove}, ${campo} n. ${k + 1}`, errori) : leggiVoce(v, `${dove}, ${campo} n. ${k + 1}`, errori)
          return r ? [r] : []
        })
        controllaSuperserie(voci, `${dove}, ${campo}`, errori)
        return voci
      }
      const riscaldamento = blocco('riscaldamento', false, false) as Prescrizione[]
      const palestra = blocco('esercizi', true, true)
      const mobilita = blocco('defaticamento', false, false) as Prescrizione[]

      const id = `s${i + 1}`
      sedute[id] = { nome: typeof s.nome === 'string' ? s.nome.trim() : id, palestra, mobilita, core: false, ...(riscaldamento.length ? { riscaldamento } : {}) }
      for (const g of giorni) settimana.push({ giorno: g, sedutaId: id })
    })

  if (errori.length || !nome) return { ok: false, errori }
  settimana.sort((a, b) => GIORNI.indexOf(a.giorno) - GIORNI.indexOf(b.giorno))
  return { ok: true, nome, obiettivi, programma: { settimana, fasi: fasiPer(obiettivi[0]), blocco_core: { varianteA: [], varianteB: [] }, sedute } }
}

function trovaEsercizio(v: unknown, dove: string, errori: string[]): Esercizio | null {
  if (typeof v !== 'string' || !v.trim()) {
    errori.push(`${dove}: manca "esercizio" (l'id dall'elenco degli esercizi).`)
    return null
  }
  const es = catalogo().find((e) => e.id === v) ?? catalogo().find((e) => norm(e.nome) === norm(v) || e.id === norm(v))
  if (es) return es
  if (esercizi.some((e) => e.id === v)) {
    errori.push(`${dove}: "${v}" e' un esercizio di pista e non si puo' usare qui.`)
    return null
  }
  const s = simili(v)
  errori.push(`${dove}: l'esercizio "${v}" non esiste.${s.length ? ` Forse: ${s.map((e) => `${e.id} (${e.nome})`).join(', ')}.` : " Usa un id dell'elenco."}`)
  return null
}

function leggiVoce(v: unknown, dove: string, errori: string[]): Prescrizione | null {
  if (!eOggetto(v)) {
    errori.push(`${dove}: deve essere un oggetto come {"esercizio": "...", "serie": 3, ...}.`)
    return null
  }
  const es = trovaEsercizio(v.esercizio, dove, errori)
  const qui = es ? `${dove} (${es.id})` : dove
  const extra = Object.keys(v).filter((k) => !CHIAVI_VOCE.has(k))
  if (extra.length) errori.push(`${qui}: campi non previsti ${extra.map((k) => `"${k}"`).join(', ')}. Ammessi: ${[...CHIAVI_VOCE].join(', ')}.`)
  if (!intero(v.serie, 1, 10)) errori.push(`${qui}: "serie" deve essere un intero da 1 a 10 (trovato ${JSON.stringify(v.serie)}).`)
  if (v.recuperoSec !== undefined && !intero(v.recuperoSec, 0, 600)) errori.push(`${qui}: "recuperoSec" deve essere un numero di secondi da 0 a 600.`)
  if (v.superserie !== undefined && (typeof v.superserie !== 'string' || !/^[A-Z]$/.test(v.superserie))) errori.push(`${qui}: "superserie" deve essere una lettera maiuscola, es. "A".`)
  if (!es) return null

  const misura = MISURA[es.tipoRegistrazione as keyof typeof MISURA]
  const p: Prescrizione = { esercizioId: es.id, serie: v.serie as number }
  const presenti = (['ripetizioni', 'durataSec', 'distanzaM'] as const).filter((k) => v[k] !== undefined)
  const sbagliati = presenti.filter((k) => k !== misura.campo)
  if (sbagliati.length) errori.push(`${qui}: si misura a ${misura.testo}, quindi usa "${misura.campo}" e non ${sbagliati.map((k) => `"${k}"`).join(', ')}.`)
  const valore = v[misura.campo]
  if (valore === undefined) errori.push(`${qui}: manca "${misura.campo}" (si misura a ${misura.testo}).`)
  else if (misura.campo === 'ripetizioni') {
    const t = String(valore).trim()
    if (!RE_RIP.test(t)) errori.push(`${qui}: "ripetizioni" non valide (${JSON.stringify(valore)}). Esempi: "8", "6-8", "10 per lato".`)
    else p.ripetizioni = t
  } else if (misura.campo === 'durataSec') {
    if (typeof valore === 'number' && valore > 0 && valore <= 3600) p.durataSec = valore
    else if (typeof valore === 'string' && RE_DURATA.test(valore.trim())) p.durataSec = /^\d+$/.test(valore.trim()) ? Number(valore) : valore.trim()
    else errori.push(`${qui}: "durataSec" deve essere un numero di secondi, es. 30 o "30 per lato".`)
  } else if (typeof valore === 'number' && valore > 0 && valore <= 5000) p.distanzaM = valore
  else errori.push(`${qui}: "distanzaM" deve essere un numero di metri.`)

  if (typeof v.recuperoSec === 'number') p.recuperoSec = v.recuperoSec
  if (typeof v.superserie === 'string') p.superserie = v.superserie
  return p
}

function leggiCircuito(v: Record<string, unknown>, dove: string, errori: string[]): VocePalestra | null {
  const extra = Object.keys(v).filter((k) => !CHIAVI_CIRCUITO.has(k))
  if (extra.length) errori.push(`${dove}: campi non previsti nel circuito ${extra.map((k) => `"${k}"`).join(', ')}. Ammessi: ${[...CHIAVI_CIRCUITO].join(', ')}.`)
  if (!Array.isArray(v.circuito) || v.circuito.length < 2) {
    errori.push(`${dove}: "circuito" deve elencare almeno 2 esercizi.`)
    return null
  }
  const ids = v.circuito.map((id, k) => trovaEsercizio(id, `${dove}, esercizio ${k + 1} del circuito`, errori)?.id)
  if (!intero(v.giri, 1, 10)) errori.push(`${dove}: "giri" deve essere un intero da 1 a 10.`)
  if (!intero(v.lavoroSec, 5, 300)) errori.push(`${dove}: "lavoroSec" deve essere un numero di secondi da 5 a 300.`)
  if (!intero(v.pausaSec, 0, 300)) errori.push(`${dove}: "pausaSec" deve essere un numero di secondi da 0 a 300.`)
  if (ids.some((id) => !id)) return null
  return { circuito: true, giri: v.giri as number, lavoroSec: v.lavoroSec as number, pausaSec: v.pausaSec as number, esercizi: ids as string[] }
}

/** Le superserie sono gruppi di almeno due esercizi consecutivi; il recupero resta solo sull'ultimo. */
function controllaSuperserie(voci: VocePalestra[], dove: string, errori: string[]) {
  const gruppi = new Map<string, number[]>()
  voci.forEach((v, i) => {
    if (!('circuito' in v) && v.superserie) gruppi.set(v.superserie, [...(gruppi.get(v.superserie) ?? []), i])
  })
  for (const [g, idx] of gruppi) {
    if (idx.length < 2) errori.push(`${dove}: la superserie "${g}" ha un solo esercizio; servono almeno due esercizi con la stessa lettera.`)
    else if (idx.some((i, k) => k > 0 && i !== idx[k - 1] + 1)) errori.push(`${dove}: gli esercizi della superserie "${g}" devono essere uno dopo l'altro.`)
    else for (const i of idx.slice(0, -1)) (voci[i] as Prescrizione).recuperoSec = 0
  }
}
