/**
 * PDF dei progressi: riepilogo, misure corporee, forza per esercizio, volume settimanale,
 * test e storico delle sedute. Indice cliccabile e segnalibri per sezione.
 */
import { jsPDF } from 'jspdf'
import { db } from '../../db/schema'
import { giorniTra } from '../../domain/calendar'
import { esercizio, programma as programmaJson, tests } from '../../domain/data'
import { nomeSedutaLog } from '../../domain/session'
import { epley, mediaMobilePeso, miglioriSeriePerSeduta, volumeSerie, volumeSettimanale } from '../../domain/stats'
import type { Misura, RisultatoTest, SedutaLog, Serie } from '../../domain/types'
import { A4, ACCENTO, ARDESIA, CHIARO, fmtData, GRIGIO, LINEA, M, num, pieDiPagina, ROSSO, t, TESTO, VERDE } from './comune'

interface Punto {
  data: string
  y: number
}

interface SerieGrafico {
  nome: string
  colore: string
  punti: Punto[]
  tipo: 'linea' | 'punti' | 'barre'
}

// ---------- disegno ----------

class Cursore {
  y = M + 10
  doc: jsPDF
  constructor(doc: jsPDF) {
    this.doc = doc
  }
  spazio(h: number) {
    if (this.y + h > A4.h - M - 8) {
      this.doc.addPage()
      this.y = M + 6
    }
  }
}

function titoloSezione(doc: jsPDF, c: Cursore, testo: string): number {
  if (c.y > M + 20) {
    doc.addPage()
    c.y = M + 6
  }
  doc.setFillColor(ACCENTO)
  doc.rect(0, 0, A4.w, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(TESTO)
  doc.text(t(testo), M, c.y + 6)
  c.y += 14
  return doc.getNumberOfPages()
}

function sottotitolo(doc: jsPDF, c: Cursore, testo: string, poi = 50) {
  c.spazio(8 + poi)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(GRIGIO)
  doc.text(t(testo.toUpperCase()), M, c.y + 4)
  c.y += 9
}

const giorno = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** Grafico nel tempo con una sola scala: linee, punti o barre; legenda se piu' serie. */
function grafico(doc: jsPDF, c: Cursore, serie: SerieGrafico[], _unita: string, h = 55) {
  const tutti = serie.flatMap((s) => s.punti)
  if (!tutti.length) return
  const W = A4.w - 2 * M
  c.spazio(h + 12)
  const x0 = M + 12
  const y0 = c.y
  const w = W - 14
  const barre = serie.some((s) => s.tipo === 'barre')
  let ymin = barre ? 0 : Math.min(...tutti.map((p) => p.y))
  let ymax = Math.max(...tutti.map((p) => p.y))
  if (ymax === ymin) {
    ymax += 1
    ymin = barre ? 0 : ymin - 1
  }
  const pad = barre ? 0 : (ymax - ymin) * 0.12
  ymin -= pad
  ymax += pad * (barre ? 0 : 1) + (barre ? (ymax - ymin) * 0.08 : 0)
  const dmin = Math.min(...tutti.map((p) => giorno(p.data)))
  const dmax = Math.max(...tutti.map((p) => giorno(p.data)))
  const X = (d: string) => (dmax === dmin ? x0 + w / 2 : x0 + ((giorno(d) - dmin) / (dmax - dmin)) * (barre ? w - 8 : w) + (barre ? 4 : 0))
  const Y = (v: number) => y0 + h - ((v - ymin) / (ymax - ymin)) * h

  // griglia e scala
  doc.setLineWidth(0.15)
  doc.setDrawColor(LINEA)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(GRIGIO)
  for (let i = 0; i <= 4; i++) {
    const v = ymin + ((ymax - ymin) * i) / 4
    const y = Y(v)
    doc.line(x0, y, x0 + w, y)
    doc.text(num(v, Math.abs(ymax - ymin) < 10 ? 1 : 0), x0 - 2, y + 1, { align: 'right' })
  }
  const date = [...new Set(tutti.map((p) => p.data))].sort()
  const etichette = date.length <= 6 ? date : [0, 0.25, 0.5, 0.75, 1].map((f) => date[Math.round(f * (date.length - 1))])
  for (const d of [...new Set(etichette)]) doc.text(fmtData(d, { day: 'numeric', month: 'short' }), X(d), y0 + h + 4, { align: 'center' })

  for (const s of serie) {
    doc.setDrawColor(s.colore)
    doc.setFillColor(s.colore)
    const pts = [...s.punti].sort((a, b) => a.data.localeCompare(b.data))
    if (s.tipo === 'barre') {
      const bw = Math.max(1.5, Math.min(8, (w / Math.max(pts.length, 1)) * 0.6))
      for (const p of pts) doc.roundedRect(X(p.data) - bw / 2, Y(p.y), bw, y0 + h - Y(p.y), 0.8, 0.8, 'F')
    } else if (s.tipo === 'punti') {
      for (const p of pts) doc.circle(X(p.data), Y(p.y), 0.8, 'F')
    } else {
      doc.setLineWidth(0.6)
      for (let i = 1; i < pts.length; i++) doc.line(X(pts[i - 1].data), Y(pts[i - 1].y), X(pts[i].data), Y(pts[i].y))
      if (pts.length < 25) for (const p of pts) doc.circle(X(p.data), Y(p.y), 0.9, 'F')
    }
  }
  c.y += h + (serie.length > 1 ? 10 : 7)
  if (serie.length > 1) {
    let x = x0
    doc.setFontSize(8)
    for (const s of serie) {
      doc.setFillColor(s.colore)
      doc.circle(x + 1.2, c.y - 1, 1.2, 'F')
      doc.setTextColor(GRIGIO)
      doc.text(t(s.nome), x + 4, c.y)
      x += doc.getTextWidth(t(s.nome)) + 12
    }
    c.y += 4
  }
  c.y += 4
  doc.setLineWidth(0.2)
}

/** Riquadri con i numeri chiave. */
function riquadri(doc: jsPDF, c: Cursore, voci: { nome: string; valore: string; nota?: string; tono?: 'verde' | 'rosso' }[]) {
  const col = 3
  const gap = 3
  const w = (A4.w - 2 * M - gap * (col - 1)) / col
  const h = 20
  voci.forEach((v, i) => {
    if (i % col === 0) {
      if (i > 0) c.y += h + gap
      c.spazio(h)
    }
    const x = M + (i % col) * (w + gap)
    doc.setFillColor(CHIARO)
    doc.roundedRect(x, c.y, w, h, 2.5, 2.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(GRIGIO)
    doc.text(t(v.nome.toUpperCase()), x + 3.5, c.y + 5.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(TESTO)
    doc.text(t(v.valore), x + 3.5, c.y + 13)
    if (v.nota) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(v.tono === 'verde' ? VERDE : v.tono === 'rosso' ? ROSSO : GRIGIO)
      doc.text(t(v.nota), x + 3.5, c.y + 17.5)
    }
  })
  c.y += h + 8
}

/** Tabella semplice con righe alternate. */
function tabella(doc: jsPDF, c: Cursore, colonne: { nome: string; w: number; destra?: boolean }[], righe: (string | { testo: string; colore: string })[][]) {
  const intestazione = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(GRIGIO)
    let x = M
    for (const col of colonne) {
      doc.text(t(col.nome), col.destra ? x + col.w - 2 : x + 2, c.y + 4, { align: col.destra ? 'right' : 'left' })
      x += col.w
    }
    c.y += 6
  }
  c.spazio(14)
  intestazione()
  righe.forEach((r, i) => {
    if (c.y + 6 > A4.h - M - 8) {
      doc.addPage()
      c.y = M + 6
      intestazione()
    }
    if (i % 2 === 0) {
      doc.setFillColor(CHIARO)
      doc.rect(M, c.y, colonne.reduce((a, b) => a + b.w, 0), 6, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    let x = M
    r.forEach((cella, k) => {
      const col = colonne[k]
      const testo = typeof cella === 'string' ? cella : cella.testo
      doc.setTextColor(typeof cella === 'string' ? TESTO : cella.colore)
      const s = doc.splitTextToSize(t(testo), col.w - 3)[0] as string
      doc.text(s, col.destra ? x + col.w - 2 : x + 2, c.y + 4.2, { align: col.destra ? 'right' : 'left' })
      x += col.w
    })
    c.y += 6
  })
  c.y += 6
}

// ---------- documento ----------

const variazione = (da: number, a: number, dec = 1, unita = '', meglioBasso = false) => {
  const d = a - da
  const tono: 'verde' | 'rosso' | undefined = d === 0 ? undefined : (d < 0) === meglioBasso ? 'verde' : 'rosso'
  return { nota: `${d > 0 ? '+' : ''}${num(d, dec)}${unita} dall'inizio`, tono }
}

export async function esportaProgressi(opzioni: { onProgresso?: (x: number) => void } = {}): Promise<Blob> {
  const [misure, sedute, serie, risultati, piani, imp] = await Promise.all([
    db.misure.orderBy('data').toArray(),
    db.sedute.orderBy('data').toArray(),
    db.serie.toArray(),
    db.risultatiTest.orderBy('data').toArray(),
    db.piani.toArray(),
    db.impostazioni.get('singleton'),
  ])
  const completate = sedute.filter((s) => s.fine !== null)
  const piano = piani.find((p) => p.id === imp?.pianoAttivo)
  const oggi = new Date().toISOString().slice(0, 10)
  const date = [...misure.map((m) => m.data), ...completate.map((s) => s.data), ...risultati.map((r) => r.data)].sort()
  const periodo = date.length ? `${fmtData(date[0])} -> ${fmtData(date.at(-1)!)}` : 'Nessun dato registrato'
  opzioni.onProgresso?.(0.1)

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({ title: 'Progressi', subject: 'Progressi di allenamento', creator: 'Allenamento' })
  const c = new Cursore(doc)
  const sezioni: { nome: string; pagina: number }[] = []

  // ---------- riepilogo ----------
  doc.setFillColor(ACCENTO)
  doc.rect(0, 0, A4.w, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(TESTO)
  doc.text('Progressi', M, c.y + 6)
  c.y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(GRIGIO)
  doc.text(t(`${periodo}  |  Esportato il ${fmtData(oggi)}`), M, c.y + 2)
  c.y += 6
  if (piano) {
    doc.text(t(`Scheda attiva: ${piano.nome}`), M, c.y + 2)
    c.y += 6
  }
  c.y += 4

  const peso = mediaMobilePeso(misure)
  const conPeso = misure.filter((m): m is Misura & { pesoKg: number } => m.pesoKg !== null)
  const primoUltimo = <K extends keyof Misura>(k: K) => {
    const v = misure.filter((m) => m[k] !== null)
    return v.length ? { primo: v[0][k] as number, ultimo: v.at(-1)![k] as number } : null
  }
  const vita = primoUltimo('vitaCm')
  const fc = primoUltimo('fcRiposoBpm')
  const ultime4 = completate.filter((s) => giorniTra(s.data, oggi) < 28).length
  const volumeTot = volumeSerie(serie)
  const pesoFinale = peso.filter((p) => p.media !== null).at(-1)?.media ?? conPeso.at(-1)?.pesoKg
  const voci: Parameters<typeof riquadri>[2] = [
    { nome: 'Sedute completate', valore: String(completate.length), nota: `${ultime4} nelle ultime 4 settimane` },
    { nome: 'Serie registrate', valore: num(serie.length, 0), nota: `volume ${num(volumeTot / 1000, 1)} t` },
    { nome: 'Test registrati', valore: String(risultati.length), nota: `${new Set(risultati.map((r) => r.testId)).size} tipi di test` },
  ]
  if (conPeso.length && pesoFinale !== undefined) voci.push({ nome: 'Peso (media 7 gg)', valore: `${num(pesoFinale)} kg`, ...variazione(conPeso[0].pesoKg, pesoFinale, 1, ' kg', true) })
  if (vita) voci.push({ nome: 'Circonferenza vita', valore: `${num(vita.ultimo)} cm`, ...variazione(vita.primo, vita.ultimo, 1, ' cm', true) })
  if (fc) voci.push({ nome: 'FC a riposo', valore: `${fc.ultimo} bpm`, ...variazione(fc.primo, fc.ultimo, 0, ' bpm', true) })
  riquadri(doc, c, voci)

  // indice: si disegna alla fine, quando si conoscono le pagine
  const yIndice = c.y
  c.y += 60

  // ---------- misure ----------
  if (misure.length) {
    sezioni.push({ nome: 'Misure corporee', pagina: titoloSezione(doc, c, 'Misure corporee') })
    if (conPeso.length) {
      sottotitolo(doc, c, 'Peso (kg)')
      grafico(doc, c, [
        { nome: 'giornaliero', colore: ARDESIA, tipo: 'punti', punti: peso.map((p) => ({ data: p.data, y: p.peso })) },
        { nome: 'media 7 giorni', colore: ACCENTO, tipo: 'linea', punti: peso.filter((p) => p.media !== null).map((p) => ({ data: p.data, y: p.media! })) },
      ], 'kg')
    }
    for (const [k, nome, u] of [
      ['vitaCm', 'Circonferenza vita (cm)', 'cm'],
      ['fcRiposoBpm', 'FC a riposo (bpm)', 'bpm'],
      ['doloreGinocchio', 'Dolore ginocchio (0-10)', ''],
    ] as const) {
      const pts = misure.filter((m) => m[k] !== null).map((m) => ({ data: m.data, y: m[k] as number }))
      if (pts.length < 2) continue
      sottotitolo(doc, c, nome)
      grafico(doc, c, [{ nome, colore: ACCENTO, tipo: 'linea', punti: pts }], u, 42)
    }
  }
  opzioni.onProgresso?.(0.35)

  // ---------- forza ----------
  const perEsercizio = new Map<string, Serie[]>()
  for (const s of serie) {
    if (s.caricoKg === null || s.ripetizioni === null) continue
    perEsercizio.set(s.esercizioId, [...(perEsercizio.get(s.esercizioId) ?? []), s])
  }
  const conStoria = [...perEsercizio.entries()]
    .map(([id, ss]) => ({ id, migliori: miglioriSeriePerSeduta(ss) }))
    .filter((x) => x.migliori.length >= 2)
    .sort((a, b) => b.migliori.length - a.migliori.length)
  const volume = volumeSettimanale(serie)
  if (conStoria.length || volume.length) {
    sezioni.push({ nome: 'Forza', pagina: titoloSezione(doc, c, 'Forza') })
    if (conStoria.length) {
      sottotitolo(doc, c, 'Riepilogo per esercizio', 20)
      tabella(
        doc,
        c,
        [
          { nome: 'Esercizio', w: 62 },
          { nome: 'Sedute', w: 18, destra: true },
          { nome: 'Prima', w: 32, destra: true },
          { nome: 'Ultima', w: 32, destra: true },
          { nome: '1RM stimato', w: 38, destra: true },
        ],
        conStoria.map(({ id, migliori }) => {
          const a = migliori[0]
          const b = migliori.at(-1)!
          const e1 = (x: typeof a) => x.e1rm ?? epley(x.caricoKg, Math.min(x.ripetizioni, 10)) ?? x.caricoKg
          const d = e1(b) / e1(a) - 1
          return [
            esercizio(id).nome,
            String(migliori.length),
            `${num(a.caricoKg)} kg × ${a.ripetizioni}`,
            `${num(b.caricoKg)} kg × ${b.ripetizioni}`,
            { testo: `${num(e1(b))} kg (${d >= 0 ? '+' : ''}${num(d * 100, 0)}%)`, colore: d > 0 ? VERDE : d < 0 ? ROSSO : TESTO },
          ]
        }),
      )
      for (const { id, migliori } of conStoria.slice(0, 8)) {
        sottotitolo(doc, c, `${esercizio(id).nome} (kg)`)
        grafico(
          doc,
          c,
          [
            { nome: 'miglior serie', colore: ARDESIA, tipo: 'linea', punti: migliori.map((m) => ({ data: m.data, y: m.caricoKg })) },
            { nome: '1RM stimato', colore: ACCENTO, tipo: 'linea', punti: migliori.filter((m) => m.e1rm !== null).map((m) => ({ data: m.data, y: Math.round(m.e1rm! * 10) / 10 })) },
          ],
          'kg',
          42,
        )
      }
    }
    if (volume.length) {
      sottotitolo(doc, c, 'Volume settimanale (kg × ripetizioni)')
      grafico(doc, c, [{ nome: 'volume', colore: ACCENTO, tipo: 'barre', punti: volume.map((v) => ({ data: v.settimana, y: v.volume })) }], 'kg', 45)
    }
  }
  opzioni.onProgresso?.(0.6)

  // ---------- test ----------
  if (risultati.length) {
    sezioni.push({ nome: 'Test', pagina: titoloSezione(doc, c, 'Test') })
    for (const def of tests) {
      const rs = risultati.filter((r) => r.testId === def.id)
      if (!rs.length) continue
      sottotitolo(doc, c, `${def.nome} (${def.unita})`, 20)
      if (rs.length >= 2) grafico(doc, c, [{ nome: def.nome, colore: ACCENTO, tipo: 'linea', punti: rs.map((r) => ({ data: r.data, y: r.valore })) }], def.unita, 36)
      tabella(
        doc,
        c,
        [
          { nome: 'Data', w: 60 },
          { nome: 'Valore', w: 60, destra: true },
          { nome: 'Rispetto al precedente', w: 62, destra: true },
        ],
        rs.map((r: RisultatoTest, i) => {
          const prec = rs[i - 1]
          const d = prec ? r.valore - prec.valore : null
          const meglio = d === null || d === 0 ? null : (d > 0) === (def.meglio === 'alto')
          return [fmtData(r.data), `${num(r.valore, 2)} ${def.unita}`, d === null ? '' : { testo: `${d > 0 ? '+' : ''}${num(d, 2)}`, colore: meglio === null ? GRIGIO : meglio ? VERDE : ROSSO }]
        }),
      )
    }
  }
  opzioni.onProgresso?.(0.8)

  // ---------- storico ----------
  if (completate.length) {
    sezioni.push({ nome: 'Storico sedute', pagina: titoloSezione(doc, c, 'Storico sedute') })
    const perSeduta = new Map<string, Serie[]>()
    for (const s of serie) perSeduta.set(s.sedutaId, [...(perSeduta.get(s.sedutaId) ?? []), s])
    tabella(
      doc,
      c,
      [
        { nome: 'Data', w: 34 },
        { nome: 'Seduta', w: 72 },
        { nome: 'Durata', w: 22, destra: true },
        { nome: 'Serie', w: 20, destra: true },
        { nome: 'Volume', w: 34, destra: true },
      ],
      [...completate].reverse().map((s: SedutaLog) => {
        const ss = perSeduta.get(s.id) ?? []
        const min = s.fine ? Math.round((new Date(s.fine).getTime() - new Date(s.inizio).getTime()) / 60000) : null
        return [fmtData(s.data, { day: 'numeric', month: 'short', year: '2-digit' }), nomeSedutaLog(s, programmaJson), min !== null ? `${min} min` : '', String(ss.length), `${num(volumeSerie(ss), 0)} kg`]
      }),
    )
  }

  // ---------- indice ----------
  doc.setPage(1)
  let y = yIndice
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(GRIGIO)
  doc.text('SEZIONI', M, y + 4)
  y += 7
  for (const s of sezioni) {
    doc.setFillColor(CHIARO)
    doc.roundedRect(M, y, A4.w - 2 * M, 11, 2.5, 2.5, 'F')
    doc.setFillColor(ACCENTO)
    doc.roundedRect(M, y, 2.5, 11, 1.2, 1.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(TESTO)
    doc.text(t(s.nome), M + 7, y + 7.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(GRIGIO)
    doc.text(`pag. ${s.pagina}  >`, A4.w - M - 5, y + 7.2, { align: 'right' })
    doc.link(M, y, A4.w - 2 * M, 11, { pageNumber: s.pagina })
    y += 13
  }
  if (!sezioni.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Nessun dato da mostrare', M, y + 4)
  }

  pieDiPagina(doc, 'Progressi')
  doc.outline.add(null, 'Riepilogo', { pageNumber: 1 })
  for (const s of sezioni) doc.outline.add(null, t(s.nome), { pageNumber: s.pagina })
  opzioni.onProgresso?.(1)
  return doc.output('blob')
}
