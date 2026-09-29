import { describe, expect, it } from 'vitest'
import { faseDellaSettimana, giornoSettimana, lunediDi, prossimaSeduta, settimanaCiclo, varianteCore } from '../src/domain/calendar'
import { programma } from '../src/domain/data'

describe('calendario', () => {
  const inizio = '2026-09-07' // lunedi'

  it('settimana del ciclo', () => {
    expect(settimanaCiclo('2026-09-07', inizio)).toBe(1)
    expect(settimanaCiclo('2026-09-13', inizio)).toBe(1)
    expect(settimanaCiclo('2026-09-14', inizio)).toBe(2)
    expect(settimanaCiclo('2026-11-29', inizio)).toBe(12)
  })

  it('ricomincia dopo 12 settimane e vale 1 prima dell\'inizio', () => {
    expect(settimanaCiclo('2026-11-30', inizio)).toBe(1)
    expect(settimanaCiclo('2026-09-01', inizio)).toBe(1)
  })

  it('attraversa il cambio dell\'ora legale senza errori', () => {
    // 25 ottobre 2026: fine ora legale in Italia
    expect(settimanaCiclo('2026-10-26', '2026-10-19')).toBe(2)
  })

  it('fase per settimana', () => {
    expect(faseDellaSettimana(programma, 1).nome).toBe('Base')
    expect(faseDellaSettimana(programma, 4).scarico).toBe(true)
    expect(faseDellaSettimana(programma, 6).nome).toBe('Forza')
    expect(faseDellaSettimana(programma, 12).test).toBe(true)
  })

  it('giorno della settimana e lunedi\'', () => {
    expect(giornoSettimana('2026-09-29')).toBe('mar')
    expect(giornoSettimana('2026-10-03')).toBeNull()
    expect(lunediDi('2026-10-04')).toBe('2026-09-28')
    expect(lunediDi('2026-09-28')).toBe('2026-09-28')
  })

  it('prossima seduta dal weekend e\' il lunedi\'', () => {
    expect(prossimaSeduta('2026-10-03')).toEqual({ data: '2026-10-05', giorno: 'lun' })
  })

  it('il core alterna le varianti', () => {
    expect(varianteCore(programma, 1).nome).toBe('A')
    expect(varianteCore(programma, 2).nome).toBe('B')
  })
})
