import { describe, expect, it } from 'vitest'
import { esercizio } from '../src/domain/data'
import { FORMATO, importaSchedaLlm, modelloPerLlm } from '../src/domain/schedaLlm'
import { strutturaSeduta } from '../src/domain/session'
import type { Prescrizione } from '../src/domain/types'

const base = (sedute: unknown[]) => JSON.stringify({ formato: FORMATO, nome: 'Prova', obiettivi: ['massa'], sedute })
const errori = (t: string) => {
  const r = importaSchedaLlm(t)
  return r.ok ? [] : r.errori
}

describe('scheda da LLM', () => {
  it("il modello elenca gli esercizi e l'esempio si importa", () => {
    const m = modelloPerLlm()
    expect(m.esercizi.length).toBeGreaterThan(100)
    expect(m.esercizi.some((e) => e.id === 'arnold_press')).toBe(true)
    expect(m.esercizi.some((e) => esercizio(e.id).tipoRegistrazione === 'pista')).toBe(false)
    const r = importaSchedaLlm(JSON.stringify(m.esempio))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.programma.settimana.map((x) => x.giorno)).toEqual(['lun', 'gio'])
    const p = r.programma
    for (const { sedutaId } of p.settimana) for (let w = 1; w <= 12; w++) strutturaSeduta(p, sedutaId, w, p.fasi.find((f) => f.settimane.includes(w))!, [])
    expect(p.sedute.s1.riscaldamento).toHaveLength(1)
  })

  it('accetta blocchi di codice, nomi al posto degli id e ripetizioni numeriche', () => {
    const testo = 'Ecco la scheda:\n```json\n' + base([{ nome: 'A', giorni: ['mar'], esercizi: [{ esercizio: 'Arnold press', serie: 3, ripetizioni: 10 }] }]) + '\n```'
    const r = importaSchedaLlm(testo)
    expect(r.ok && (r.programma.sedute.s1.palestra![0] as Prescrizione)).toMatchObject({ esercizioId: 'arnold_press', ripetizioni: '10' })
  })

  it('errori chiari con la posizione e un suggerimento', () => {
    expect(errori('')[0]).toMatch(/vuoto/)
    expect(errori('{"nome": "x",}')[0]).toMatch(/JSON non e' valido/)
    const e = errori(
      base([
        { nome: 'Spinta', giorni: ['lun'], esercizi: [{ esercizio: 'arnold_pres', serie: 3, ripetizioni: '8' }, { esercizio: 'plank', serie: 3, ripetizioni: 10 }] },
        { nome: 'Tirata', giorni: ['lun', 'domenica'], esercizi: [{ esercizio: 'trazioni', serie: 20, ripetizioni: '8', superserie: 'A' }], exercises: [] },
      ]),
    )
    expect(e).toContain('Seduta 1 «Spinta», esercizi n. 1: l\'esercizio "arnold_pres" non esiste. Forse: arnold_press (Arnold press).')
    expect(e.some((x) => x.includes('esercizi n. 2 (plank): si misura a tempo (secondi), quindi usa "durataSec"'))).toBe(true)
    expect(e.some((x) => x.includes('il giorno "lun" e\' gia\' assegnato a Seduta 1'))).toBe(true)
    expect(e.some((x) => x.includes('giorno "domenica" non valido'))).toBe(true)
    expect(e.some((x) => x.includes('"serie" deve essere un intero da 1 a 10'))).toBe(true)
    expect(e.some((x) => x.includes('superserie "A" ha un solo esercizio'))).toBe(true)
    expect(e.some((x) => x.includes('campi non previsti "exercises"'))).toBe(true)
  })

  it('superserie: recupero solo sull\'ultimo', () => {
    const r = importaSchedaLlm(base([{ nome: 'A', giorni: ['lun'], esercizi: [{ esercizio: 'push_up', serie: 3, ripetizioni: '10', recuperoSec: 60, superserie: 'A' }, { esercizio: 'rematore_manubrio', serie: 3, ripetizioni: '10', recuperoSec: 90, superserie: 'A' }] }]))
    expect(r.ok && r.programma.sedute.s1.palestra!.map((v) => (v as Prescrizione).recuperoSec)).toEqual([0, 90])
  })
})
