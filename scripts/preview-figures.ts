// Genera un foglio HTML con tutte le figure (posizione A, meta', B) per il controllo visivo.
import { writeFileSync } from 'node:fs'
import { figuraSvg } from '../src/figures/engine'
import { FIGURE } from '../src/figures/poses'
import esercizi from '../src/data/exercises.json' with { type: 'json' }

const only = process.argv[2] ? process.argv[2].split(",") : undefined
const celle = esercizi
  .filter((e) => !only || only.includes(e.id))
  .map((e) => {
    const def = FIGURE[e.id]
    const svgs = def ? [0, 0.5, 1].map((t) => figuraSvg(def, t, 'width="240" height="196"')).join('') : '<b style="color:red">MANCANTE</b>'
    return `<div class="c"><div class="n">${e.id}</div>${svgs}</div>`
  })
writeFileSync(
  process.argv[3] ?? 'figure-preview.html',
  `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:11px sans-serif;color:#111;background:#fff;display:grid;grid-template-columns:repeat(2,1fr);gap:4px}.c{border:1px solid #ddd}.n{padding:2px 4px;font-weight:bold}svg{border-right:1px dashed #eee}</style>${celle.join('')}`,
)
