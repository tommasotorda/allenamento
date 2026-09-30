import { describe, expect, it } from 'vitest'
import { esercizio, programma } from '../src/domain/data'
import { caricoSuggerito, primoNumero, serieEffettive, testoPrescrizione } from '../src/domain/progression'
import { strutturaSeduta } from '../src/domain/session'
import type { Serie } from '../src/domain/types'

const base = programma.fasi[0]
const scarico = programma.fasi[1]
const forza = programma.fasi[2]

const serie = (numero: number, caricoKg: number | null, rpe: number | null): Serie => ({
  id: String(numero), sedutaId: 's', esercizioId: 'x', data: '2026-01-01', numero, ripetizioni: 5, caricoKg, durataSec: null, distanzaM: null, lato: null, rpe,
})

describe('progressione', () => {
  it('scarico: -40% delle serie arrotondato per eccesso, minimo 1', () => {
    const tb = esercizio('trap_bar_deadlift')
    expect(serieEffettive(5, base, tb)).toBe(5)
    expect(serieEffettive(5, scarico, tb)).toBe(3)
    expect(serieEffettive(4, scarico, tb)).toBe(3)
    expect(serieEffettive(3, scarico, tb)).toBe(2)
    expect(serieEffettive(1, scarico, tb)).toBe(1)
  })

  it('lo scarico non tocca core e mobilita\'', () => {
    expect(serieEffettive(3, scarico, esercizio('plank'))).toBe(3)
    expect(serieEffettive(2, scarico, esercizio('rotazioni_esterne_elastico'))).toBe(2)
  })

  it('carico suggerito: +incremento solo se tutte le serie a RPE <= 7', () => {
    expect(caricoSuggerito([serie(1, 100, 7), serie(2, 100, 6.5)], 2.5)).toBe(102.5)
    expect(caricoSuggerito([serie(1, 100, 7), serie(2, 100, 8)], 2.5)).toBe(100)
    expect(caricoSuggerito([serie(1, 100, null)], 2.5)).toBe(100)
    expect(caricoSuggerito([], 2.5)).toBeNull()
  })

  it('prescrizione con RPE e ripetizioni della fase', () => {
    const p = programma.sedute.lun.palestra![0] as never
    const tb = esercizio('trap_bar_deadlift')
    expect(testoPrescrizione(p, base, tb)).toBe('5 × 3-5 · RPE 7')
    expect(testoPrescrizione(p, forza, tb)).toBe('5 × 3-4 · RPE 8')
    expect(testoPrescrizione(p, scarico, tb)).toBe('3 × 3-5 · RPE 6')
  })

  it('durate testuali con l\'unita\' dopo il numero', () => {
    const e = esercizio('side_plank')
    expect(testoPrescrizione({ esercizioId: 'side_plank', serie: 3, durataSec: '40 per lato' }, base, e)).toBe('3 × 40 s per lato')
    expect(testoPrescrizione({ esercizioId: 'side_plank', serie: 3, durataSec: 40 }, base, e)).toBe('3 × 40 s')
  })

  it('primo numero da testo', () => {
    expect(primoNumero('8 per lato')).toBe(8)
    expect(primoNumero('3-5')).toBe(3)
    expect(primoNumero(40)).toBe(40)
    expect(primoNumero(undefined)).toBeNull()
  })
})

describe('struttura seduta', () => {
  it('pista in scarico usa la variante di scarico', () => {
    const s = strutturaSeduta(programma, 'gio', 4, scarico, [])
    expect(s.pista?.testo).toBe('25 min corsa in Zona 2')
    expect(s.pista?.ripetute).toBeNull()
    expect(strutturaSeduta(programma, 'gio', 5, forza, []).pista?.ripetute).toBe(5)
  })

  it('sbloccabili: sostituzione o aggiunta', () => {
    const s = strutturaSeduta(programma, 'mar', 1, base, ['box_squat', 'saltelli_sul_posto'])
    const ids = s.palestra.map((v) => ('esercizioId' in v ? v.esercizioId : 'circuito'))
    expect(ids).toContain('box_squat')
    expect(ids).not.toContain('step_up_basso')
    expect(ids.at(-1)).toBe('saltelli_sul_posto')
  })

  it('mercoledi\' senza core', () => {
    expect(strutturaSeduta(programma, 'mer', 1, base, []).core).toBeUndefined()
    expect(strutturaSeduta(programma, 'lun', 2, base, []).core?.variante).toBe('B')
  })
})
