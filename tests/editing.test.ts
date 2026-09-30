import { describe, expect, it } from 'vitest'
import { esercizio, programma } from '../src/domain/data'
import { bloccoModificato, conVoci, leggiIntervallo, ripristinaBlocco, scriviIntervallo, sostituisci, suggerisciSostituti, vociBlocco } from '../src/domain/editing'
import { pianoOriginale } from '../src/domain/plans'
import { espandi, somiglianza } from '../src/domain/muscles'
import { strutturaSeduta } from '../src/domain/session'
import type { Prescrizione } from '../src/domain/types'

describe('scheda personalizzata', () => {
  const piano = () => pianoOriginale('2026-09-07')

  it('il piano originale nasce dal JSON e ricorda la versione iniziale', () => {
    const p = piano()
    expect(p.programma).toEqual(programma)
    expect(p.originale).toEqual(programma)
    expect(p.programma).not.toBe(programma)
  })

  it('modifica un blocco lasciando intatti gli altri', () => {
    const p = piano()
    const voci = vociBlocco(p.programma, { tipo: 'palestra', sedutaId: 'lun' }).slice(1)
    const n = conVoci(p.programma, { tipo: 'palestra', sedutaId: 'lun' }, voci)
    expect(n.sedute.lun.palestra).toHaveLength(programma.sedute.lun.palestra!.length - 1)
    expect(n.sedute.lun.pista).toEqual(programma.sedute.lun.pista)
    expect(n.sedute.gio).toEqual(programma.sedute.gio)
    expect(bloccoModificato({ ...p, programma: n }, { tipo: 'palestra', sedutaId: 'lun' })).toBe(true)
    expect(bloccoModificato({ ...p, programma: n }, { tipo: 'palestra', sedutaId: 'gio' })).toBe(false)
  })

  it('il core modificato vale per tutte le sedute con core', () => {
    const eff = conVoci(programma, { tipo: 'core', variante: 'A' }, [{ esercizioId: 'hollow_hold', serie: 2, durataSec: 20 }])
    const base = programma.fasi[0]
    expect(strutturaSeduta(eff, 'lun', 1, base, []).core?.voci.map((v) => v.esercizioId)).toEqual(['hollow_hold'])
    expect(strutturaSeduta(eff, 'gio', 1, base, []).core?.voci.map((v) => v.esercizioId)).toEqual(['hollow_hold'])
    expect(strutturaSeduta(eff, 'lun', 2, base, []).core?.variante).toBe('B')
    expect(strutturaSeduta(eff, 'mer', 1, base, []).core).toBeUndefined()
  })

  it('ripristino di un blocco', () => {
    const p = piano()
    p.programma = conVoci(p.programma, { tipo: 'mobilita', sedutaId: 'mer' }, [])
    p.programma = conVoci(p.programma, { tipo: 'palestra', sedutaId: 'ven' }, [])
    const r = ripristinaBlocco(p, { tipo: 'mobilita', sedutaId: 'mer' })
    expect(r.sedute.mer).toEqual(programma.sedute.mer)
    expect(r.sedute.ven.palestra).toEqual([])
  })

  it('le modifiche della versione precedente confluiscono nel piano originale', () => {
    const p = pianoOriginale('2026-09-09', { sedute: { lun: { palestra: [{ esercizioId: 'push_up', serie: 3 }] } } })
    expect(p.inizio).toBe('2026-09-07')
    expect(p.programma.sedute.lun.palestra).toEqual([{ esercizioId: 'push_up', serie: 3 }])
    expect(p.programma.sedute.lun.pista).toEqual(programma.sedute.lun.pista)
  })

  it('sostituzione: mantiene serie e recupero, adatta le misure al nuovo tipo', () => {
    const p: Prescrizione = { esercizioId: 'panca_piana', serie: 5, ripetizioni: '3-5', rpe: 'fase', recuperoSec: 120 }
    expect(sostituisci(p, esercizio('push_up'))).toEqual({ esercizioId: 'push_up', serie: 5, ripetizioni: '10', recuperoSec: 120 })
    expect(sostituisci(p, esercizio('military_press'))).toMatchObject({ serie: 5, ripetizioni: '3-5', rpe: 'fase' })
    expect(sostituisci(p, esercizio('plank'))).toMatchObject({ serie: 5, durataSec: 30, recuperoSec: 120 })
  })

  it('intervalli di ripetizioni', () => {
    expect(leggiIntervallo('3-5')).toEqual({ min: 3, max: 5, resto: '' })
    expect(leggiIntervallo('8 per lato')).toEqual({ min: 8, max: 8, resto: ' per lato' })
    expect(leggiIntervallo('max-2')).toBeNull()
    expect(scriviIntervallo(6, 8, ' per lato')).toBe('6-8 per lato')
    expect(scriviIntervallo(5, 5, '')).toBe('5')
  })
})

describe('muscoli e suggerimenti', () => {
  it('gli alias si espandono e vale il livello piu\' alto', () => {
    expect(espandi({ quadricipiti: 2, 'vasto-mediale': 3 })).toEqual({ 'retto-femorale': 2, 'vasto-laterale': 2, 'vasto-mediale': 3 })
  })

  it('somiglianza coseno', () => {
    expect(somiglianza({ bicipite: 3 }, { bicipite: 1 })).toBeCloseTo(1)
    expect(somiglianza({ bicipite: 3 }, { tricipite: 3 })).toBe(0)
  })

  it('suggerisce esercizi affini per muscoli', () => {
    const panca = suggerisciSostituti('panca_piana').map((s) => s.es.id)
    expect(panca.slice(0, 3)).toEqual(expect.arrayContaining(['push_up', 'lancio_palla_medica_petto']))
    const stacco = suggerisciSostituti('trap_bar_deadlift').map((s) => s.es.id)
    expect(stacco).toContain('box_squat')
    expect(suggerisciSostituti('trazioni').map((s) => s.es.id)[0]).toBe('lat_machine')
  })

  it('i suggerimenti escludono gli esercizi gia\' presenti e la pista', () => {
    const s = suggerisciSostituti('panca_piana', ['push_up']).map((x) => x.es.id)
    expect(s).not.toContain('push_up')
    expect(s.some((id) => esercizio(id).categoria === 'pista')).toBe(false)
  })
})
