import type { Esercizio, Programma } from './types'

/** Id di tutti gli esercizi referenziati dal programma. */
export function idUsati(p: Programma): { id: string; dove: string }[] {
  const out: { id: string; dove: string }[] = []
  const add = (id: string | undefined, dove: string) => id && out.push({ id, dove })
  for (const [k, lista] of Object.entries({ varianteA: p.blocco_core.varianteA, varianteB: p.blocco_core.varianteB })) {
    for (const x of lista) add(x.esercizioId, `blocco_core.${k}`)
  }
  for (const [g, s] of Object.entries(p.sedute)) {
    add(s.pista?.esercizioId, `${g}.pista`)
    for (const v of s.palestra ?? []) {
      if ('circuito' in v) v.esercizi.forEach((id) => add(id, `${g}.circuito`))
      else {
        add(v.esercizioId, `${g}.palestra`)
        add(v.alternativa, `${g}.palestra.alternativa`)
        add(v.superserieCon, `${g}.palestra.superserieCon`)
      }
    }
    for (const x of s.sbloccabili ?? []) {
      add(x.esercizioId, `${g}.sbloccabili`)
      add(x.sostituisce, `${g}.sbloccabili.sostituisce`)
    }
    for (const x of s.mobilita ?? []) add(x.esercizioId, `${g}.mobilita`)
  }
  return out
}

export function validaDati(esercizi: Esercizio[], p: Programma, figure: string[]): string[] {
  const errori: string[] = []
  const ids = new Set<string>()
  for (const e of esercizi) {
    if (ids.has(e.id)) errori.push(`id duplicato: ${e.id}`)
    ids.add(e.id)
    if (!e.esecuzione?.length) errori.push(`${e.id}: manca la descrizione dell'esecuzione`)
    if (!figure.includes(e.id)) errori.push(`${e.id}: manca la figura SVG`)
  }
  for (const { id, dove } of idUsati(p)) {
    if (!ids.has(id)) errori.push(`${dove}: esercizio inesistente "${id}"`)
  }
  const settimane = p.fasi.flatMap((f) => f.settimane).sort((a, b) => a - b)
  if (settimane.join() !== Array.from({ length: 12 }, (_, i) => i + 1).join()) errori.push('le fasi non coprono esattamente le settimane 1-12')
  return errori
}
