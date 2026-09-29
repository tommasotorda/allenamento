import { describe, expect, it } from 'vitest'
import { esercizi, programma } from '../src/domain/data'
import { validaDati } from '../src/domain/validate'
import { FIGURE } from '../src/figures/poses'

describe('validazione dati', () => {
  it('i dati attuali sono validi', () => {
    expect(validaDati(esercizi, programma, Object.keys(FIGURE))).toEqual([])
  })

  it('fallisce se il programma usa un esercizio non presente', () => {
    const rotto = structuredClone(programma)
    rotto.sedute.lun.palestra!.push({ esercizioId: 'inesistente', serie: 3 })
    expect(validaDati(esercizi, rotto, Object.keys(FIGURE)).join()).toContain('inesistente')
  })
})
