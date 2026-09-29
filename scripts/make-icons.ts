// Genera le icone PWA (SVG + PNG, solo macOS) partendo dalla figura della corsa.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { figuraSvg } from '../src/figures/engine'
import { FIGURE } from '../src/figures/poses'

const fig = figuraSvg({ ...FIGURE.sprint_salita, floor: false }, 0.15)
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>$/, '')

// figura bianca su fondo arancio, centrata; `maskable` lascia piu' margine per il ritaglio di Android
const icona = (scala: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#f97316"/>
<g transform="translate(${256 - 125 * scala} ${256 - 133 * scala}) scale(${scala})" color="#fff" style="--fig-prop:#fff;--fig-accent:#fff">${fig}</g>
</svg>`

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon.svg', icona(2.7))
writeFileSync('public/favicon.svg', icona(2.7))

// Quick Look (macOS) rasterizza l'SVG, sips ridimensiona
const tmp = mkdtempSync(join(tmpdir(), 'icone-'))
writeFileSync(join(tmp, 'maskable.svg'), icona(2.1))
execFileSync('qlmanage', ['-t', '-s', '512', '-o', tmp, 'public/icons/icon.svg', join(tmp, 'maskable.svg')], { stdio: 'ignore' })
copyFileSync(join(tmp, 'icon.svg.png'), 'public/icons/icon-512.png')
copyFileSync(join(tmp, 'maskable.svg.png'), 'public/icons/maskable-512.png')
for (const [nome, px] of [['icon-192.png', 192], ['apple-touch-icon.png', 180]] as const) {
  execFileSync('sips', ['-z', String(px), String(px), 'public/icons/icon-512.png', '--out', `public/icons/${nome}`], { stdio: 'ignore' })
}
console.log('icone generate')
