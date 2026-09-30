import type { Coinvolgimento, MuscoloId } from '../domain/muscles'
import { FRONTE, RETRO, specchia, type Pannello, type Vista } from './muscleGeometry'

export type VistaMappa = 'entrambe' | 'fronte' | 'retro'

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ')

function pannelli(p: Pannello): string {
  if (p.pts.length === 0) return ''
  const a = `<polygon points="${pts(p.pts)}"/>`
  return p.centrale ? a : a + `<polygon points="${pts(specchia(p.pts))}"/>`
}

function vista(v: Vista, nome: 'fronte' | 'retro', prefisso: string, livelli: Coinvolgimento, dx: number): string {
  const corpo = v.corpo.map(pannelli).join('')
  const muscoli = (Object.entries(v.muscoli) as [MuscoloId, Pannello[]][])
    .map(([id, ps]) => {
      const l = livelli[id] ?? 0
      return `<g id="${prefisso}-${nome}-${id}" class="muscolo" data-muscolo="${id}" data-livello="${l}">${ps.map(pannelli).join('')}</g>`
    })
    .join('')
  return `<g id="${prefisso}-${nome}" transform="translate(${dx} 0)"><circle class="corpo" cx="50" cy="11.5" r="8.5"/><g class="corpo">${corpo}</g>${muscoli}</g>`
}

/**
 * SVG della mappa muscolare. Ogni gruppo ha un id univoco `<prefisso>-<vista>-<muscolo>`
 * e l'attributo `data-livello` (0-3) che il CSS usa per il colore.
 */
export function mappaSvg(livelli: Coinvolgimento, opzioni: { vista?: VistaMappa; prefisso?: string; titolo?: string } = {}): string {
  const v = opzioni.vista ?? 'entrambe'
  const pre = opzioni.prefisso ?? 'mm'
  const parti: string[] = []
  if (v !== 'retro') parti.push(vista(FRONTE, 'fronte', pre, livelli, 0))
  if (v !== 'fronte') parti.push(vista(RETRO, 'retro', pre, livelli, v === 'entrambe' ? 104 : 0))
  const w = v === 'entrambe' ? 204 : 100
  const titolo = opzioni.titolo ? `<title>${opzioni.titolo}</title>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 1 ${w} 204" class="mappa-muscoli" role="img">${titolo}${parti.join('')}</svg>`
}
