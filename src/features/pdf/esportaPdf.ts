/**
 * PDF navigabile della scheda: indice con un pulsante per giorno e, per ogni giorno,
 * tre viste (Scheda, Muscoli, Dettaglio) collegate da linguette. Solo link interni tra
 * pagine: funziona in tutti i lettori (iPhone, Anteprima, Acrobat).
 */
import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import { esercizio, NOMI_CATEGORIE, NOMI_GIORNI } from '../../domain/data'
import { suggerisciSostituti } from '../../domain/editing'
import { NOMI_OBIETTIVI } from '../../domain/generator'
import { espandi, MUSCOLI, perLivello, type Coinvolgimento, type Livello, type MuscoloId } from '../../domain/muscles'
import { scadenza } from '../../domain/plans'
import { formatSec, testoPrescrizione } from '../../domain/progression'
import { elencoSedute, strutturaSeduta } from '../../domain/session'
import { isCircuito, type Circuito, type Fase, type Piano, type Prescrizione } from '../../domain/types'
import { figuraSvg } from '../../figures/engine'
import { COLORI_MAPPA, mappaSvg } from '../../figures/muscleMap'
import { FIGURE } from '../../figures/poses'
import { A4, ACCENTO, CHIARO, fmtData, GRIGIO, LINEA, M, pieDiPagina, righe, SCARICO, t, TESTO } from './comune'

// ---------- stile ----------

const HEADER_H = 30 // spazio occupato dalle linguette in alto

type Vista = 'scheda' | 'muscoli' | 'dettaglio'
const VISTE: { id: Vista; nome: string }[] = [
  { id: 'scheda', nome: 'Scheda' },
  { id: 'muscoli', nome: 'Muscoli' },
  { id: 'dettaglio', nome: 'Dettaglio' },
]

// ---------- svg ----------

let contenitore: HTMLDivElement | null = null

async function svg(doc: jsPDF, markup: string, x: number, y: number, w: number, h: number) {
  if (!contenitore) {
    contenitore = document.createElement('div')
    contenitore.style.cssText = 'position:fixed;left:-10000px;top:0;width:400px;height:400px;visibility:hidden'
    document.body.appendChild(contenitore)
  }
  const el = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement as unknown as SVGSVGElement
  contenitore.appendChild(el)
  try {
    await svg2pdf(el, doc, { x, y, width: w, height: h })
  } finally {
    el.remove()
    // svg2pdf lascia impostati spessore e colori dell'ultimo tratto
    doc.setLineWidth(0.25)
  }
}

/** Figura dell'esercizio con colori fissi (il PDF non conosce le variabili CSS). */
function figura(id: string, fotogramma: 0 | 1): string | null {
  const def = FIGURE[id]
  if (!def) return null
  return figuraSvg(def, fotogramma)
    .replace(/var\(--fig-prop,(#[0-9a-f]+)\)/gi, '#64748b')
    .replace(/var\(--fig-accent,(#[0-9a-f]+)\)/gi, ACCENTO)
    .replace(/var\(--fig-floor,(#[0-9a-f]+)\)/gi, '#cbd5e1')
    .replace(/currentColor/g, TESTO)
}

const mappa = (c: Coinvolgimento) => mappaSvg(c, { inline: true, prefisso: 'pdf' })

// ---------- modello del documento ----------

interface Voce {
  blocco: string
  p?: Prescrizione
  circuito?: Circuito
}

interface Giorno {
  sedutaId: string
  titolo: string
  voci: Voce[]
  testi: { blocco: string; testo: string }[]
  pagine: Record<Vista, number[]>
}

function vociDelGiorno(piano: Piano, sedutaId: string, settimana: number, fase: Fase, sbloccati: string[]): Pick<Giorno, 'voci' | 'testi'> {
  const p = piano.programma
  const s = strutturaSeduta(p, sedutaId, settimana, fase, sbloccati)
  const voci: Voce[] = []
  const testi: Giorno['testi'] = []
  if (p.sedute[sedutaId].core) {
    for (const [v, lista] of [['A', p.blocco_core.varianteA], ['B', p.blocco_core.varianteB]] as const) {
      for (const x of lista) voci.push({ blocco: `Core · variante ${v} (settimane ${v === 'A' ? 'dispari' : 'pari'})`, p: x })
    }
  }
  if (s.pista) testi.push({ blocco: 'Pista', testo: `${esercizio(s.pista.esercizioId).nome}: ${s.pista.testo}${s.pista.ripetute ? ` (${s.pista.ripetute} ripetute)` : ''}` })
  if (s.attivita) testi.push({ blocco: 'Attività', testo: `${s.attivita.tipo[0].toUpperCase()}${s.attivita.tipo.slice(1)} · ${s.attivita.durataMin} min` })
  for (const v of s.palestra) voci.push(isCircuito(v) ? { blocco: 'Palestra', circuito: v } : { blocco: 'Palestra', p: v })
  for (const v of s.mobilita) voci.push({ blocco: 'Defaticamento e mobilità', p: v })
  return { voci, testi }
}

/** Coinvolgimento complessivo di una seduta: per ogni muscolo il livello massimo. */
function coinvolgimentoSeduta(voci: Voce[]): Coinvolgimento {
  const c: Coinvolgimento = {}
  for (const v of voci) {
    const ids = v.circuito ? v.circuito.esercizi : v.p ? [v.p.esercizioId] : []
    for (const id of ids) for (const [m, l] of Object.entries(espandi(esercizio(id).muscoli)) as [MuscoloId, Livello][]) c[m] = Math.max(c[m] ?? 0, l) as Livello
  }
  return c
}

// ---------- disegno ----------

class Pagina {
  y = M + HEADER_H
  doc: jsPDF
  constructor(doc: jsPDF) {
    this.doc = doc
  }
  /** Garantisce `h` mm liberi; altrimenti apre una nuova pagina e la registra. */
  spazio(h: number, nuova: () => void) {
    if (this.y + h > A4.h - M - 8) {
      this.doc.addPage()
      nuova()
      this.y = M + HEADER_H
    }
  }
}

function titoloBlocco(doc: jsPDF, pag: Pagina, testo: string, nuova: () => void, poi = 30) {
  pag.spazio(8 + poi, nuova)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(GRIGIO)
  doc.text(t(testo.toUpperCase()), M, pag.y + 4)
  pag.y += 7
}


export async function esportaPdf(piano: Piano, opzioni: { settimana: number; sbloccati: string[]; onProgresso?: (x: number) => void }): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({ title: t(piano.nome), subject: 'Scheda di allenamento', creator: 'Allenamento' })
  const settimana = opzioni.settimana
  const fase = piano.programma.fasi.find((f) => f.settimane.includes(settimana)) ?? piano.programma.fasi[0]
  const sedute = elencoSedute(piano.programma)

  const giorni: Giorno[] = sedute.map((x) => ({
    sedutaId: x.sedutaId,
    titolo: `${x.giorni.map((g) => NOMI_GIORNI[g]).join(', ') || 'Seduta'} · ${x.nome}`,
    ...vociDelGiorno(piano, x.sedutaId, settimana, fase, opzioni.sbloccati),
    pagine: { scheda: [], muscoli: [], dettaglio: [] },
  }))

  // ---------- pagina 1: indice (i pulsanti si disegnano alla fine, quando si conoscono le pagine) ----------
  const passi = giorni.length * 3
  let fatti = 0
  const avanza = () => opzioni.onProgresso?.(Math.min(1, ++fatti / passi))

  for (const g of giorni) {
    for (const v of VISTE) {
      doc.addPage()
      const registra = () => g.pagine[v.id].push(doc.getNumberOfPages())
      registra()
      const pag = new Pagina(doc)
      if (v.id === 'scheda') await vistaScheda(doc, pag, g, fase, registra)
      if (v.id === 'muscoli') await vistaMuscoli(doc, pag, g, registra)
      if (v.id === 'dettaglio') vistaDettaglio(doc, pag, g, piano, registra)
      avanza()
    }
  }

  // indice
  doc.setPage(1)
  disegnaIndice(doc, piano, giorni, settimana, fase)

  // linguette e piè di pagina su tutte le pagine dei giorni
  for (const g of giorni) {
    for (const v of VISTE) {
      for (const n of g.pagine[v.id]) {
        doc.setPage(n)
        disegnaLinguette(doc, g, v.id)
      }
    }
  }
  pieDiPagina(doc, piano.nome)

  // segnalibri nella barra laterale del lettore
  doc.outline.add(null, 'Indice', { pageNumber: 1 })
  for (const g of giorni) {
    const nodo = doc.outline.add(null, t(g.titolo), { pageNumber: g.pagine.scheda[0] })
    for (const v of VISTE) doc.outline.add(nodo, v.nome, { pageNumber: g.pagine[v.id][0] })
  }

  return doc.output('blob')
}

function disegnaIndice(doc: jsPDF, piano: Piano, giorni: Giorno[], settimana: number, fase: Fase) {
  let y = M + 4
  doc.setFillColor(ACCENTO)
  doc.rect(0, 0, A4.w, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(TESTO)
  for (const r of righe(doc, piano.nome, A4.w - 2 * M)) {
    doc.text(r, M, y + 8)
    y += 9
  }
  y += 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(GRIGIO)
  const obiettivi = piano.obiettivi.map((o) => NOMI_OBIETTIVI[o]).join(' · ')
  doc.text(t(`${obiettivi}${obiettivi ? '  |  ' : ''}${fmtData(piano.inizio)} -> ${fmtData(scadenza(piano))}`), M, y + 4)
  y += 6
  doc.text(t(`Prescrizioni della settimana ${settimana}: ${fase.nome}  |  Esportata il ${fmtData(new Date().toISOString().slice(0, 10))}`), M, y + 4)
  y += 12

  // le 12 settimane del ciclo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('CICLO', M, y)
  y += 3
  const w = (A4.w - 2 * M - 11 * 1.5) / 12
  for (let i = 0; i < 12; i++) {
    const s = i + 1
    const f = piano.programma.fasi.find((x) => x.settimane.includes(s))!
    const x = M + i * (w + 1.5)
    doc.setFillColor(f.scarico ? SCARICO : s === settimana ? ACCENTO : CHIARO)
    doc.roundedRect(x, y, w, 10, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(s === settimana && !f.scarico ? '#ffffff' : TESTO)
    doc.text(String(s), x + w / 2, y + 6.5, { align: 'center' })
  }
  y += 14
  // nomi delle fasi sotto i loro gruppi di settimane
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(GRIGIO)
  for (const f of piano.programma.fasi) {
    const x = M + (f.settimane[0] - 1) * (w + 1.5)
    const lw = f.settimane.length * (w + 1.5) - 1.5
    const r = righe(doc, f.nome, lw)
    doc.text(r, x + lw / 2, y, { align: 'center' })
  }
  y += 14

  // pulsanti dei giorni
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(GRIGIO)
  doc.text('SEDUTE  (tocca un giorno)', M, y)
  y += 4
  for (const g of giorni) {
    const h = 17
    doc.setFillColor(CHIARO)
    doc.roundedRect(M, y, A4.w - 2 * M, h, 3, 3, 'F')
    doc.setFillColor(ACCENTO)
    doc.roundedRect(M, y, 3, h, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(TESTO)
    doc.text(t(g.titolo), M + 8, y + 7, { maxWidth: A4.w - 2 * M - 30 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(GRIGIO)
    const n = g.voci.reduce((a, v) => a + (v.circuito ? v.circuito.esercizi.length : 1), 0)
    doc.text(t(`${n} esercizi${g.testi.length ? ' · ' + g.testi.map((x) => x.blocco.toLowerCase()).join(', ') : ''}`), M + 8, y + 12.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(ACCENTO)
    doc.text('>', A4.w - M - 7, y + 10.5)
    doc.link(M, y, A4.w - 2 * M, h, { pageNumber: g.pagine.scheda[0] })
    y += h + 3
    if (y > A4.h - M - 30) break
  }

  // legenda dei colori della mappa muscolare
  y = Math.max(y + 4, A4.h - M - 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(GRIGIO)
  let x = M
  for (const [l, n] of [[3, 'primari'], [2, 'secondari'], [1, 'stabilizzatori']] as const) {
    doc.setFillColor(COLORI_MAPPA.livelli[l])
    doc.roundedRect(x, y - 3, 4, 4, 1, 1, 'F')
    doc.text(`Muscoli ${n}`, x + 6, y)
    x += 42
  }
}

function disegnaLinguette(doc: jsPDF, g: Giorno, attiva: Vista) {
  doc.setFillColor(ACCENTO)
  doc.rect(0, 0, A4.w, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(TESTO)
  doc.text(t(g.titolo), M, M + 3, { maxWidth: A4.w - 2 * M })
  const schede: { nome: string; pagina: number; attiva: boolean }[] = [
    ...VISTE.map((v) => ({ nome: v.nome, pagina: g.pagine[v.id][0], attiva: v.id === attiva })),
    { nome: 'Indice', pagina: 1, attiva: false },
  ]
  const w = (A4.w - 2 * M - 3 * 3) / 4
  const y = M + 8
  schede.forEach((s, i) => {
    const x = M + i * (w + 3)
    doc.setFillColor(s.attiva ? ACCENTO : CHIARO)
    doc.roundedRect(x, y, w, 10, 2.5, 2.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(s.attiva ? '#ffffff' : TESTO)
    doc.text(s.nome, x + w / 2, y + 6.6, { align: 'center' })
    doc.link(x, y, w, 10, { pageNumber: s.pagina })
  })
  doc.setDrawColor(LINEA)
  doc.setLineWidth(0.25)
  doc.line(M, M + HEADER_H - 6, A4.w - M, M + HEADER_H - 6)
}

// ---------- viste ----------

function rigaEsercizioTesto(doc: jsPDF, x: number, y: number, larghezza: number, p: Prescrizione, fase: Fase) {
  const e = esercizio(p.esercizioId)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(TESTO)
  doc.text(t(e.nome), x, y + 5, { maxWidth: larghezza })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(t(testoPrescrizione(p, fase, e)), x, y + 11)
  doc.setFontSize(9)
  doc.setTextColor(GRIGIO)
  const extra = [p.recuperoSec ? `Recupero ${formatSec(p.recuperoSec)}` : null, p.superserieCon ? `Superserie con ${esercizio(p.superserieCon).nome}` : null, p.alternativa ? `Alternativa: ${esercizio(p.alternativa).nome}` : null]
    .filter(Boolean)
    .join(' · ')
  if (extra) doc.text(t(extra), x, y + 16.5, { maxWidth: larghezza })
}

async function vistaScheda(doc: jsPDF, pag: Pagina, g: Giorno, fase: Fase, nuova: () => void) {
  let blocco = ''
  for (const tx of g.testi) {
    titoloBlocco(doc, pag, tx.blocco, nuova)
    const r = righe(doc, tx.testo, A4.w - 2 * M - 8)
    pag.spazio(r.length * 5 + 6, nuova)
    doc.setFillColor(CHIARO)
    doc.roundedRect(M, pag.y, A4.w - 2 * M, r.length * 5 + 5, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(TESTO)
    doc.text(r, M + 4, pag.y + 6)
    pag.y += r.length * 5 + 9
  }
  const IMG_W = 29
  const IMG_H = 24
  for (const v of g.voci) {
    if (v.blocco !== blocco) {
      blocco = v.blocco
      titoloBlocco(doc, pag, blocco, nuova)
    }
    if (v.circuito) {
      const c = v.circuito
      pag.spazio(14, nuova)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(TESTO)
      doc.text(`Circuito · ${c.giri} giri · ${c.lavoroSec} s lavoro / ${c.pausaSec} s pausa`, M, pag.y + 5)
      pag.y += 9
      for (const id of c.esercizi) {
        pag.spazio(IMG_H + 3, nuova)
        const f = figura(id, 1)
        if (f) await svg(doc, f, M, pag.y, IMG_W, IMG_H)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10.5)
        doc.setTextColor(TESTO)
        doc.text(t(esercizio(id).nome), M + IMG_W + 4, pag.y + 13)
        pag.y += IMG_H + 3
      }
      continue
    }
    const p = v.p!
    pag.spazio(IMG_H + 4, nuova)
    // posizione iniziale e finale
    for (const [k, fr] of [[0, 0], [1, 1]] as const) {
      doc.setFillColor(CHIARO)
      doc.roundedRect(M + k * (IMG_W + 2), pag.y, IMG_W, IMG_H, 2, 2, 'F')
      const f = figura(p.esercizioId, fr)
      if (f) await svg(doc, f, M + k * (IMG_W + 2), pag.y, IMG_W, IMG_H)
    }
    rigaEsercizioTesto(doc, M + 2 * IMG_W + 8, pag.y + 1, A4.w - 2 * M - 2 * IMG_W - 8, p, fase)
    pag.y += IMG_H + 2
    doc.setDrawColor(LINEA)
    doc.line(M, pag.y, A4.w - M, pag.y)
    pag.y += 2
  }
}

const NOMI_LIVELLI: [Livello, string][] = [
  [3, 'Primari'],
  [2, 'Secondari'],
  [1, 'Stabilizzatori'],
]

function elencoMuscoli(doc: jsPDF, c: Coinvolgimento, x: number, y: number, larghezza: number): number {
  let yy = y
  doc.setFontSize(9)
  for (const [l, nome] of NOMI_LIVELLI) {
    const ms = perLivello(c, l)
    if (!ms.length) continue
    doc.setFillColor(COLORI_MAPPA.livelli[l])
    doc.roundedRect(x, yy - 2.8, 3, 3, 0.8, 0.8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TESTO)
    doc.text(`${nome}:`, x + 5, yy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(GRIGIO)
    const r = righe(doc, ms.map((m) => MUSCOLI[m].nome).join(', '), larghezza - 32)
    doc.text(r, x + 30, yy)
    yy += r.length * 4.2 + 1.5
  }
  return yy - y
}

async function vistaMuscoli(doc: jsPDF, pag: Pagina, g: Giorno, nuova: () => void) {
  // mappa complessiva della seduta
  const tot = coinvolgimentoSeduta(g.voci)
  titoloBlocco(doc, pag, 'Muscoli della seduta', nuova, 72)
  const W = 70
  await svg(doc, mappa(tot), M, pag.y, W, W)
  elencoMuscoli(doc, tot, M + W + 6, pag.y + 8, A4.w - 2 * M - W - 6)
  pag.y += W + 4

  titoloBlocco(doc, pag, 'Per esercizio', nuova)
  const ids = g.voci.flatMap((v) => (v.circuito ? v.circuito.esercizi : v.p ? [v.p.esercizioId] : []))
  const visti = new Set<string>()
  for (const id of ids) {
    if (visti.has(id)) continue
    visti.add(id)
    const e = esercizio(id)
    const c = espandi(e.muscoli)
    const S = 30
    pag.spazio(S + 3, nuova)
    await svg(doc, mappa(c), M, pag.y, S, S)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(TESTO)
    doc.text(t(e.nome), M + S + 5, pag.y + 5)
    elencoMuscoli(doc, c, M + S + 5, pag.y + 11, A4.w - 2 * M - S - 5)
    pag.y += S + 1
    doc.setDrawColor(LINEA)
    doc.line(M, pag.y, A4.w - M, pag.y)
    pag.y += 2
  }
}

function vistaDettaglio(doc: jsPDF, pag: Pagina, g: Giorno, piano: Piano, nuova: () => void) {
  const L = A4.w - 2 * M
  const visti = new Set<string>()
  const presenti = g.voci.flatMap((v) => (v.circuito ? v.circuito.esercizi : v.p ? [v.p.esercizioId] : []))
  const voci: { id: string; p?: Prescrizione; circuito?: Circuito }[] = []
  for (const v of g.voci) {
    if (v.circuito) v.circuito.esercizi.forEach((id) => voci.push({ id, circuito: v.circuito }))
    else if (v.p) voci.push({ id: v.p.esercizioId, p: v.p })
  }
  for (const v of voci) {
    if (visti.has(v.id)) continue
    visti.add(v.id)
    const e = esercizio(v.id)
    doc.setFontSize(9.5)
    const passi = e.esecuzione.map((s, i) => righe(doc, `${i + 1}. ${s}`, L - 8))
    const perFase = v.p ? piano.programma.fasi.map((f) => ({ f, testo: testoPrescrizione(v.p!, f, e) })) : []
    // la tabella delle fasi serve solo se la prescrizione cambia durante il ciclo
    const fasi = new Set(perFase.map((x) => x.testo)).size > 1
      ? perFase.map(({ f, testo }) => `Sett. ${f.settimane.length > 1 ? `${f.settimane[0]}-${f.settimane.at(-1)}` : f.settimane[0]} ${f.nome}: ${testo}`)
      : []
    const alternative = suggerisciSostituti(v.id, presenti, 3)
    pag.spazio(45, nuova)

    doc.setFillColor(CHIARO)
    doc.roundedRect(M, pag.y, L, 11, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(TESTO)
    doc.text(t(e.nome), M + 4, pag.y + 7.3)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(GRIGIO)
    doc.text(t(NOMI_CATEGORIE[e.categoria]), A4.w - M - 4, pag.y + 7.3, { align: 'right' })
    pag.y += 15

    doc.setFontSize(9.5)
    doc.setTextColor(TESTO)
    const info = [
      v.p ? `Prescrizione: ${testoPrescrizione(v.p, piano.programma.fasi[0], e)}${v.p.recuperoSec ? ` · recupero ${formatSec(v.p.recuperoSec)}` : ''}` : null,
      v.circuito ? `Nel circuito: ${v.circuito.giri} giri × ${v.circuito.lavoroSec} s lavoro / ${v.circuito.pausaSec} s pausa` : null,
      `Attrezzatura: ${e.attrezzatura.length ? e.attrezzatura.join(', ') : 'corpo libero'}`,
    ].filter((x): x is string => !!x)
    for (const i of info) {
      for (const r of righe(doc, i, L - 8)) {
        pag.spazio(5, nuova)
        doc.text(r, M + 4, pag.y)
        pag.y += 4.6
      }
    }
    pag.y += 1.5
    doc.setFont('helvetica', 'bold')
    doc.text('Esecuzione', M + 4, pag.y)
    pag.y += 4.6
    doc.setFont('helvetica', 'normal')
    for (const r of passi.flat()) {
      pag.spazio(5, nuova)
      doc.text(r, M + 6, pag.y)
      pag.y += 4.3
    }
    if (fasi.length) {
      pag.y += 1.5
      pag.spazio(10, nuova)
      doc.setFont('helvetica', 'bold')
      doc.text('Nelle fasi del ciclo', M + 4, pag.y)
      pag.y += 4.6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(GRIGIO)
      for (const f of fasi) {
        pag.spazio(5, nuova)
        doc.text(t(f), M + 6, pag.y)
        pag.y += 4.3
      }
      doc.setTextColor(TESTO)
    }
    if (alternative.length) {
      pag.y += 1.5
      pag.spazio(6, nuova)
      doc.setFont('helvetica', 'bold')
      doc.text('Alternative:', M + 4, pag.y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(GRIGIO)
      doc.text(t(alternative.map((a) => `${a.es.nome} (${Math.round(a.punteggio * 100)}%)`).join(', ')), M + 26, pag.y, { maxWidth: L - 26 })
      doc.setTextColor(TESTO)
      pag.y += 5
    }
    pag.y += 5
  }
}
