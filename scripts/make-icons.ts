// Genera icona dell'app e favicon (SVG + PNG). Solo macOS: Quick Look rasterizza l'SVG, sips ridimensiona.
// Disegno: kettlebell stilizzato con una linea di progressione in salita, bianco su arancio sfumato.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SFUMATURA = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffa24c"/>
  <stop offset="0.55" stop-color="#f97316"/>
  <stop offset="1" stop-color="#e2470b"/>
</linearGradient>`

/** Glifo in un riquadro 512: `s` scala attorno al centro (le icone maskable richiedono margine). */
const glifo = (s: number, colorePercorso: string) => `<g transform="translate(256 276) scale(${s}) translate(-256 -276)">
  <path d="M176 262 C150 196 162 124 256 124 C350 124 362 196 336 262" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round"/>
  <path d="M202 428 A120 120 0 1 1 310 428 Z" fill="#fff"/>
  <polyline points="198,368 238,328 268,354 318,304" fill="none" stroke="${colorePercorso}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="286,302 320,302 320,336" fill="none" stroke="${colorePercorso}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
</g>`

/** Icona a tutto campo: iOS e Android arrotondano gli angoli da soli. */
const icona = (s: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>${SFUMATURA}</defs>
<rect width="512" height="512" fill="url(#g)"/>
${glifo(s, '#f26b12')}
</svg>`

/** Favicon: angoli arrotondati propri, glifo piu' grande per restare leggibile a 16 px. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>${SFUMATURA}</defs>
<rect width="512" height="512" rx="120" fill="url(#g)"/>
${glifo(1.12, '#f26b12')}
</svg>`

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon.svg', icona(1))
writeFileSync('public/favicon.svg', favicon)

const tmp = mkdtempSync(join(tmpdir(), 'icone-'))
writeFileSync(join(tmp, 'maskable.svg'), icona(0.82))
writeFileSync(join(tmp, 'favicon.svg'), favicon)
execFileSync('qlmanage', ['-t', '-s', '512', '-o', tmp, 'public/icons/icon.svg', join(tmp, 'maskable.svg'), join(tmp, 'favicon.svg')], { stdio: 'ignore' })
copyFileSync(join(tmp, 'icon.svg.png'), 'public/icons/icon-512.png')
copyFileSync(join(tmp, 'maskable.svg.png'), 'public/icons/maskable-512.png')
for (const [nome, px, da] of [
  ['icons/icon-192.png', 192, 'public/icons/icon-512.png'],
  ['icons/apple-touch-icon.png', 180, 'public/icons/icon-512.png'],
  ['favicon-32.png', 32, join(tmp, 'favicon.svg.png')],
  ['favicon-16.png', 16, join(tmp, 'favicon.svg.png')],
] as const) {
  execFileSync('sips', ['-z', String(px), String(px), da, '--out', `public/${nome}`], { stdio: 'ignore' })
}
console.log('icone generate')
