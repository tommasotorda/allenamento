// Anteprima HTML delle mappe muscolari di alcuni esercizi (controllo visivo della geometria).
import { readFileSync, writeFileSync } from 'node:fs'
import esercizi from '../src/data/exercises.json' with { type: 'json' }
import { espandi } from '../src/domain/muscles'
import { mappaSvg } from '../src/figures/muscleMap'

const ids = process.argv[2] ? process.argv[2].split(',') : esercizi.map((e) => e.id)
const css = readFileSync('src/index.css', 'utf8').split('/* ---- mappa muscolare')[1].replace(/^[^*]*\*\//, '')
const celle = ids.map((id) => {
  const e = esercizi.find((x) => x.id === id)!
  return `<div class="c"><b>${e.nome}</b>${mappaSvg(espandi(e.muscoli), { prefisso: id })}</div>`
})
writeFileSync(process.argv[3] ?? 'muscle-preview.html', `<!doctype html><meta charset="utf-8"><style>body{font:12px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px;background:#fafafa}.c{background:#fff;padding:6px;border-radius:8px}.c svg{height:300px}${css}</style>${celle.join('')}`)
