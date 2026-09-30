/**
 * Adattamento di una scheda verso una o piu' direzioni (forza, massa, potenza, resistenza,
 * mobilita', stabilita') e proposte automatiche di adattamento.
 */
import { aggiungiGiorni, giorniTra } from './calendar'
import { esercizi, esercizio } from './data'
import { suggerisciSostituti } from './editing'
import { disponibile, fasiPer, prescrivi, type Risposte } from './generator'
import { espandi } from './muscles'
import { scadenza, scaduto, settimanaAssoluta } from './plans'
import { testoPrescrizione } from './progression'
import { epley } from './stats'
import { isCircuito, type Attrezzo, type Esercizio, type Obiettivo, type Piano, type Prescrizione, type Programma, type RisultatoTest, type SedutaLog, type Serie } from './types'
import { clona } from './util'

export interface Modifica {
  seduta: string
  testo: string
}

export const DESCR_DIREZIONI: Record<Obiettivo, string> = {
  forza: 'Meno ripetizioni, più carico e recuperi lunghi',
  massa: 'Volume medio-alto, 6-12 ripetizioni',
  potenza: 'Esercizi esplosivi in apertura, poche ripetizioni veloci',
  resistenza: 'Più ripetizioni, recuperi brevi, circuito finale',
  mobilita: 'Più stretching e yoga a fine seduta',
  stabilita: 'Core in ogni seduta, esercizi monolaterali e funzionali',
}

/** Attrezzi e livello deducibili da una scheda che non viene dal questionario. */
export function contestoDa(p: Programma, risposte?: Risposte): Pick<Risposte, 'attrezzi' | 'evitare' | 'livello'> {
  if (risposte) return risposte
  const ids = new Set<string>()
  for (const s of Object.values(p.sedute)) {
    for (const v of s.palestra ?? []) (isCircuito(v) ? v.esercizi : [v.esercizioId]).forEach((id) => ids.add(id))
    for (const v of s.mobilita ?? []) ids.add(v.esercizioId)
  }
  const attrezzi = new Set<Attrezzo>()
  let livello: 1 | 2 | 3 = 1
  for (const id of ids) {
    const e = esercizi.find((x) => x.id === id)
    if (!e) continue
    e.attrezzi.flat().forEach((a) => attrezzi.add(a))
    livello = Math.max(livello, e.livello) as 1 | 2 | 3
  }
  return { attrezzi: [...attrezzi], evitare: [], livello: Math.min(livello, 2) as 1 | 2 }
}

const esplosivo = (e: Esercizio) => e.schemi.includes('pliometria') || e.schemi.includes('balistico')

export function adatta(p: Programma, direzioni: Obiettivo[], ctx: Pick<Risposte, 'attrezzi' | 'evitare' | 'livello'>): { programma: Programma; modifiche: Modifica[] } {
  const out = clona(p)
  const modifiche: Modifica[] = []
  const [primaria] = direzioni
  const secondaria = direzioni[1] ?? primaria
  const usati = new Set<string>()
  const disp = (e: Esercizio) => disponibile(e, ctx)

  for (const s of Object.values(out.sedute)) {
    const mod = (testo: string) => modifiche.push({ seduta: s.nome, testo })
    if (!s.palestra?.length && !s.mobilita?.length) continue
    const palestra = s.palestra ?? []

    // 1. parametri: i primi due esercizi con carico sono i principali
    let principali = 0
    const nuova = palestra.map((v) => {
      if (isCircuito(v)) return v
      const e = esercizio(v.esercizioId)
      if (e.categoria === 'pista' || (esplosivo(e) && primaria !== 'potenza')) return v
      const ruolo = e.tipoRegistrazione === 'carico_ripetizioni' && principali < 2 ? 'principale' : 'accessorio'
      if (ruolo === 'principale') principali++
      const n = prescrivi(e, ruolo === 'principale' ? primaria : secondaria, ruolo, ctx.livello)
      const prima = testoPrescrizione(v, out.fasi[0], e)
      const dopo = testoPrescrizione(n, fasiPer(primaria)[0], e)
      if (prima !== dopo) mod(`${e.nome}: ${prima} → ${dopo}`)
      return n
    })

    // 2. potenza: un esercizio esplosivo in apertura
    if (direzioni.includes('potenza') && !nuova.some((v) => !isCircuito(v) && esplosivo(esercizio(v.esercizioId)))) {
      const e = esercizi.filter((x) => x.categoria === 'potenza' && esplosivo(x) && disp(x) && !usati.has(x.id)).sort((a, b) => Number(b.funzionale) - Number(a.funzionale) || a.id.localeCompare(b.id))[0]
      if (e) {
        usati.add(e.id)
        nuova.unshift(prescrivi(e, 'potenza', 'accessorio', ctx.livello))
        mod(`Aggiunto in apertura: ${e.nome}`)
      }
    }

    // 3. stabilita': un esercizio monolaterale o funzionale al posto dell'ultimo accessorio bilaterale
    if (direzioni.includes('stabilita')) {
      if (!s.core) {
        s.core = true
        mod('Aggiunto il blocco core')
      }
      const idx = [...nuova.keys()].reverse().find((i) => {
        const v = nuova[i]
        return !isCircuito(v) && !esercizio(v.esercizioId).funzionale && esercizio(v.esercizioId).categoria !== 'pista'
      })
      if (idx !== undefined) {
        const v = nuova[idx] as Prescrizione
        const presenti = nuova.flatMap((x) => (isCircuito(x) ? x.esercizi : [x.esercizioId]))
        const alt = suggerisciSostituti(v.esercizioId, presenti, 20).find((x) => x.es.funzionale && disp(x.es))
        if (alt) {
          nuova[idx] = { ...prescrivi(alt.es, secondaria, 'accessorio', ctx.livello) }
          mod(`${esercizio(v.esercizioId).nome} → ${alt.es.nome}`)
        }
      }
    }

    // 4. resistenza: circuito finale
    if (direzioni.includes('resistenza') && !nuova.some(isCircuito)) {
      const presenti = new Set(nuova.flatMap((x) => (isCircuito(x) ? x.esercizi : [x.esercizioId])))
      const scegli = (schemi: string[]) =>
        esercizi.find((e) => ['potenza', 'core', 'forza'].includes(e.categoria) && e.schemi.some((x) => schemi.includes(x)) && disp(e) && !presenti.has(e.id) && !usati.has(e.id))
      const scelti = [scegli(['balistico', 'locomozione', 'cardio']), scegli(['anti-rotazione', 'anti-estensione']), scegli(['trasporto'])].filter((e): e is Esercizio => !!e)
      if (scelti.length >= 2) {
        scelti.forEach((e) => usati.add(e.id))
        nuova.push({ circuito: true, giri: ctx.livello === 1 ? 3 : 4, lavoroSec: 40, pausaSec: 20, esercizi: scelti.map((e) => e.id) })
        mod(`Aggiunto circuito: ${scelti.map((e) => e.nome).join(', ')}`)
      }
    }
    s.palestra = nuova

    // 5. mobilita': almeno 4 esercizi di allungamento per i muscoli della seduta
    if (direzioni.includes('mobilita')) {
      const mob = [...(s.mobilita ?? [])]
      const muscoli: Record<string, number> = {}
      for (const v of nuova) for (const id of isCircuito(v) ? v.esercizi : [v.esercizioId]) for (const [k, l] of Object.entries(espandi(esercizio(id).muscoli))) muscoli[k] = Math.max(muscoli[k] ?? 0, l)
      const presenti = new Set(mob.map((m) => m.esercizioId))
      const candidati = esercizi
        .filter((e) => ['stretching', 'yoga'].includes(e.categoria) && disp(e) && !presenti.has(e.id))
        .map((e) => ({ e, p: Object.entries(espandi(e.muscoli)).reduce((t, [k, v]) => t + v * (muscoli[k] ?? 1), 0) - (usati.has(e.id) ? 5 : 0) }))
        .sort((a, b) => b.p - a.p || a.e.id.localeCompare(b.e.id))
      for (const { e } of candidati) {
        if (mob.length >= 4) break
        mob.push({ ...prescrivi(e, 'mobilita', 'accessorio', ctx.livello), serie: 2, recuperoSec: undefined })
        usati.add(e.id)
        mod(`Aggiunto a fine seduta: ${e.nome}`)
      }
      s.mobilita = mob
    }
  }

  out.fasi = fasiPer(primaria)
  return { programma: out, modifiche }
}

// ---------- proposte automatiche ----------

export interface Proposta {
  chiave: string
  testo: string
}

export function proposteAdattamento(piano: Piano, oggi: string, sedute: SedutaLog[], serie: Serie[], test: RisultatoTest[]): Proposta[] {
  const out: Proposta[] = []
  const miePrima = sedute.filter((s) => (s.pianoId ?? 'originale') === piano.id && s.fine !== null && s.data >= piano.inizio)

  if (scaduto(piano, oggi)) {
    const [y, m, d] = scadenza(piano).split('-').map(Number)
    const data = new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
    out.push({ chiave: 'scadenza', testo: `Scheda di ${piano.settimane} settimane conclusa il ${data}` })
  }

  const sett = settimanaAssoluta(piano, oggi)
  if (sett >= 8 && !scaduto(piano, oggi)) {
    const dalla8 = aggiungiGiorni(piano.inizio, 7 * 7)
    const fatti = new Set(test.filter((r) => r.data >= dalla8).map((r) => r.testId))
    if (fatti.size >= 2) out.push({ chiave: 'test-8', testo: `Test di metà ciclo registrati (${fatti.size})` })
  }

  const perSettimana = new Set(piano.programma.settimana.map((x) => x.giorno)).size || 1
  const meta = perSettimana * 6
  if (miePrima.length >= meta && !scaduto(piano, oggi)) out.push({ chiave: 'meta', testo: `${miePrima.length} sedute completate su ${perSettimana * piano.settimane}` })

  // progressione di forza: 1RM stimato cresciuto di almeno il 10% sullo stesso esercizio
  const ids = new Set(miePrima.map((s) => s.id))
  const perEs = new Map<string, { data: string; e1rm: number }[]>()
  for (const s of serie) {
    if (!ids.has(s.sedutaId) || s.caricoKg === null || s.ripetizioni === null) continue
    const v = epley(s.caricoKg, s.ripetizioni)
    if (v === null) continue
    const arr = perEs.get(s.esercizioId) ?? []
    arr.push({ data: s.data, e1rm: v })
    perEs.set(s.esercizioId, arr)
  }
  for (const [id, arr] of perEs) {
    const date = [...new Set(arr.map((x) => x.data))].sort()
    if (date.length < 3) continue
    const max = (d: string) => Math.max(...arr.filter((x) => x.data === d).map((x) => x.e1rm))
    const inc = max(date.at(-1)!) / max(date[0]) - 1
    if (inc >= 0.1) out.push({ chiave: `1rm-${id}`, testo: `1RM stimato ${esercizio(id).nome} +${Math.round(inc * 100)}%` })
  }

  const chiuse = new Set(piano.proposteChiuse ?? [])
  return out.filter((p) => !chiuse.has(p.chiave))
}

export function giorniAllaScadenza(piano: Piano, oggi: string): number {
  return giorniTra(oggi, scadenza(piano))
}
