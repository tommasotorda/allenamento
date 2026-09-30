/** Stile e utilità condivise dai PDF (scheda e progressi). */
import type { jsPDF } from 'jspdf'

export const A4 = { w: 210, h: 297 }
export const M = 14
export const TESTO = '#18181b'
export const GRIGIO = '#71717a'
export const CHIARO = '#f4f4f5'
export const LINEA = '#e4e4e7'
export const ACCENTO = '#f97316'
export const ARDESIA = '#64748b'
export const VERDE = '#16a34a'
export const ROSSO = '#dc2626'
export const SCARICO = '#bae6fd'

/** Il font standard del PDF usa la codifica Windows-1252: sostituisce i pochi caratteri fuori. */
export const t = (s: string) =>
  s
    .replace(/→/g, '->')
    .replace(/[′’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')

export const fmtData = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', opts)
}

export const num = (n: number, dec = 1) => n.toLocaleString('it-IT', { maximumFractionDigits: dec })

export function righe(doc: jsPDF, testo: string, larghezza: number): string[] {
  return doc.splitTextToSize(t(testo), larghezza) as string[]
}

/** Numero di pagina e nome in fondo a ogni pagina. */
export function pieDiPagina(doc: jsPDF, nome: string) {
  const tot = doc.getNumberOfPages()
  for (let n = 1; n <= tot; n++) {
    doc.setPage(n)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(GRIGIO)
    doc.text(t(nome), M, A4.h - 8)
    doc.text(`${n} / ${tot}`, A4.w - M, A4.h - 8, { align: 'right' })
  }
}

export const nomeFilePdf = (prefisso: string, nome: string) =>
  `${prefisso}-${nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)}.pdf`

/** Condivide (iPhone) o scarica (Mac) un PDF. */
export async function consegnaPdf(blob: Blob, nome: string, titolo: string) {
  const file = new File([blob], nome, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
