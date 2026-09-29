import { describe, expect, it } from 'vitest'
import { epley, mediaMobilePeso, miglioriSeriePerSeduta, volumeSettimanale } from '../src/domain/stats'
import type { Misura, Serie } from '../src/domain/types'

const m = (data: string, pesoKg: number | null): Misura => ({ data, pesoKg, vitaCm: null, fcRiposoBpm: null, doloreGinocchio: null })
const s = (sedutaId: string, data: string, caricoKg: number, ripetizioni: number): Serie => ({
  id: `${sedutaId}${caricoKg}${ripetizioni}`, sedutaId, esercizioId: 'x', data, numero: 1, ripetizioni, caricoKg, durataSec: null, distanzaM: null, lato: null, rpe: null,
})

describe('statistiche', () => {
  it('Epley solo fino a 10 ripetizioni', () => {
    expect(epley(100, 5)).toBeCloseTo(116.667, 2)
    expect(epley(100, 1)).toBe(100)
    expect(epley(100, 12)).toBeNull()
  })

  it('media mobile 7 giorni con almeno 3 misure', () => {
    const r = mediaMobilePeso([m('2026-01-01', 98), m('2026-01-02', 97), m('2026-01-04', 96), m('2026-01-10', 95), m('2026-01-05', null)])
    expect(r.map((x) => x.media)).toEqual([null, null, 97, null])
  })

  it('miglior serie per seduta secondo il 1RM stimato', () => {
    const r = miglioriSeriePerSeduta([s('a', '2026-01-01', 100, 5), s('a', '2026-01-01', 110, 1), s('b', '2026-01-08', 105, 3)])
    expect(r).toHaveLength(2)
    expect(r[0].caricoKg).toBe(100)
    expect(r[1].sedutaId).toBe('b')
  })

  it('volume settimanale raggruppato per lunedi\'', () => {
    const r = volumeSettimanale([s('a', '2026-09-29', 100, 5), s('b', '2026-10-02', 50, 10), s('c', '2026-10-05', 10, 10)])
    expect(r).toEqual([
      { settimana: '2026-09-28', volume: 1000 },
      { settimana: '2026-10-05', volume: 100 },
    ])
  })
})
