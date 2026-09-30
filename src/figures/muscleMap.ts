import type { Coinvolgimento, MuscoloId } from '../domain/muscles'
import { FRONTE, RETRO, specchia, type Pannello, type Vista } from './muscleGeometry'

export type VistaMappa = 'entrambe' | 'fronte' | 'retro'
/** muscolo -> intensita' 0-1: colore continuo al posto dei tre livelli */
export type Intensita = Partial<Record<MuscoloId, number>>

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ')

function pannelli(p: Pannello): string {
  if (p.pts.length === 0) return ''
  const a = `<polygon points="${pts(p.pts)}"/>`
  return p.centrale ? a : a + `<polygon points="${pts(specchia(p.pts))}"/>`
}

/** Colori scritti negli attributi (per PDF e immagini, dove il CSS della pagina non arriva). */
export const COLORI_MAPPA = { base: '#3a3a3c', linea: '#1a1a1a', livelli: ['#3a3a3c', '#7a2e29', '#c0322b', '#ff3b30'] }

/** Livello (per il CSS) e colore continuo di un muscolo in una mappa di intensita' 0-1. */
function daIntensita(i: number): { livello: number; stile: string } {
  if (!(i > 0)) return { livello: 0, stile: '' }
  return { livello: i > 0.66 ? 3 : i > 0.33 ? 2 : 1, stile: ` style="fill:color-mix(in srgb, var(--mm-3) ${Math.round(12 + 88 * i)}%, var(--mm-base))"` }
}

function vista(v: Vista, nome: 'fronte' | 'retro', prefisso: string, livelli: Coinvolgimento, dx: number, inline: boolean, intensita?: Intensita): string {
  const stile = (fill: string) => (inline ? ` fill="${fill}" stroke="${COLORI_MAPPA.linea}" stroke-width="0.5" stroke-linejoin="round"` : '')
  const corpo = v.corpo.map(pannelli).join('')
  const muscoli = (Object.entries(v.muscoli) as [MuscoloId, Pannello[]][])
    .map(([id, ps]) => {
      const h = intensita ? daIntensita(intensita[id] ?? 0) : null
      const l = h ? h.livello : (livelli[id] ?? 0)
      return `<g id="${prefisso}-${nome}-${id}" class="muscolo" data-muscolo="${id}" data-livello="${l}"${stile(COLORI_MAPPA.livelli[l])}${h?.stile ?? ''}>${ps.map(pannelli).join('')}</g>`
    })
    .join('')
  return `<g id="${prefisso}-${nome}" transform="translate(${dx} 0)"><circle class="corpo" cx="50" cy="11.5" r="8.5"${stile(COLORI_MAPPA.base)}/><g class="corpo"${stile(COLORI_MAPPA.base)}>${corpo}</g>${muscoli}</g>`
}

/**
 * SVG della mappa muscolare. Ogni gruppo ha un id univoco `<prefisso>-<vista>-<muscolo>`
 * e l'attributo `data-livello` (0-3) che il CSS usa per il colore.
 */
export function mappaSvg(livelli: Coinvolgimento, opzioni: { vista?: VistaMappa; prefisso?: string; titolo?: string; inline?: boolean; intensita?: Intensita } = {}): string {
  const v = opzioni.vista ?? 'entrambe'
  const pre = opzioni.prefisso ?? 'mm'
  const parti: string[] = []
  if (v !== 'retro') parti.push(vista(FRONTE, 'fronte', pre, livelli, 0, !!opzioni.inline, opzioni.intensita))
  if (v !== 'fronte') parti.push(vista(RETRO, 'retro', pre, livelli, v === 'entrambe' ? 104 : 0, !!opzioni.inline, opzioni.intensita))
  const w = v === 'entrambe' ? 204 : 100
  const titolo = opzioni.titolo ? `<title>${opzioni.titolo}</title>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 1 ${w} 204" class="mappa-muscoli" role="img">${titolo}${parti.join('')}</svg>`
}
