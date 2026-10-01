import { describe, expect, it } from 'vitest'
import { esercizio } from '../src/domain/data'
import { impostaSuperserie, normalizzaSuperserie, spostaVoce, vociBlocco, type Blocco } from '../src/domain/editing'
import { pianoLibero } from '../src/domain/plans'
import { conMisura, modoDaSerie, modoRegistrazione } from '../src/domain/progression'
import { etichetteSuperserie } from '../src/domain/session'
import type { Prescrizione, Programma, VocePalestra } from '../src/domain/types'

const P = (id: string, extra: Partial<Prescrizione> = {}): Prescrizione => ({ esercizioId: id, serie: 3, ripetizioni: '8', recuperoSec: 90, ...extra })
const ids = (v: VocePalestra[]) => v.map((x) => ('circuito' in x ? 'circ' : x.esercizioId))
const palestra: Blocco = { tipo: 'palestra', sedutaId: 's1' }
const riscaldamento: Blocco = { tipo: 'riscaldamento', sedutaId: 's1' }

function programma(voci: VocePalestra[], risc: VocePalestra[] = []): Programma {
  const p = pianoLibero({ nome: 'x', giorni: ['lun'], progressione: 'forza', inizio: '2026-09-28' }).programma
  return { ...p, sedute: { s1: { ...p.sedute.s1, palestra: voci, riscaldamento: risc as Prescrizione[] } } }
}

describe('spostamenti', () => {
  it('sposta dentro lo stesso blocco (indice di inserimento prima dello spostamento)', () => {
    const p = programma([P('panca_piana'), P('trazioni'), P('push_up')])
    expect(ids(vociBlocco(spostaVoce(p, { blocco: palestra, indice: 0 }, { blocco: palestra, indice: 3 }), palestra))).toEqual(['trazioni', 'push_up', 'panca_piana'])
    expect(ids(vociBlocco(spostaVoce(p, { blocco: palestra, indice: 2 }, { blocco: palestra, indice: 0 }), palestra))).toEqual(['push_up', 'panca_piana', 'trazioni'])
  })

  it('sposta in un altro blocco e lascia la superserie', () => {
    const p = programma([P('panca_piana', { superserie: 'A', recuperoSec: 0 }), P('trazioni', { superserie: 'A', recuperoSec: 120 }), P('push_up')], [P('cat_cow')])
    const n = spostaVoce(p, { blocco: palestra, indice: 0 }, { blocco: riscaldamento, indice: 1 })
    expect(ids(vociBlocco(n, riscaldamento))).toEqual(['cat_cow', 'panca_piana'])
    const mossa = vociBlocco(n, riscaldamento)[1] as Prescrizione
    expect(mossa.superserie).toBeUndefined()
    expect(mossa.recuperoSec).toBe(120)
    // la compagna rimasta sola esce dalla superserie
    expect((vociBlocco(n, palestra)[0] as Prescrizione).superserie).toBeUndefined()
  })

  it('i circuiti non escono dal blocco palestra', () => {
    const p = programma([{ circuito: true, giri: 3, lavoroSec: 30, pausaSec: 15, esercizi: ['burpee'] }])
    expect(spostaVoce(p, { blocco: palestra, indice: 0 }, { blocco: riscaldamento, indice: 0 })).toBe(p)
  })

  it('uscendo dal mezzo di una superserie il gruppo si ricompone', () => {
    const v = [P('panca_piana', { superserie: 'A', recuperoSec: 0 }), P('trazioni', { superserie: 'A', recuperoSec: 0 }), P('push_up', { superserie: 'A', recuperoSec: 90 }), P('curl_manubri')]
    const p = programma(v)
    const n = vociBlocco(spostaVoce(p, { blocco: palestra, indice: 2 }, { blocco: palestra, indice: 4 }), palestra) as Prescrizione[]
    expect(ids(n)).toEqual(['panca_piana', 'trazioni', 'curl_manubri', 'push_up'])
    expect(n.map((x) => x.superserie)).toEqual(['A', 'A', undefined, undefined])
    // il recupero passa all'ultimo del gruppo
    expect(n.map((x) => x.recuperoSec)).toEqual([0, 90, 90, 90])
  })
})

describe('superserie scelte', () => {
  const base = () => [P('panca_piana'), P('curl_manubri'), P('trazioni'), P('push_up')]

  it('mette in fila gli esercizi scelti a partire dal primo', () => {
    const n = impostaSuperserie(base(), 0, [2]) as Prescrizione[]
    expect(ids(n)).toEqual(['panca_piana', 'trazioni', 'curl_manubri', 'push_up'])
    expect([...etichetteSuperserie(n).values()].map((x) => x.etichetta)).toEqual(['A1', 'A2'])
    expect(n[0].recuperoSec).toBe(0)
    expect(n[1].recuperoSec).toBe(90)
  })

  it('tri-serie e scioglimento', () => {
    const tri = impostaSuperserie(base(), 1, [0, 3]) as Prescrizione[]
    expect(ids(tri)).toEqual(['panca_piana', 'curl_manubri', 'push_up', 'trazioni'])
    expect(tri.slice(0, 3).every((x) => x.superserie === 'A')).toBe(true)
    // tolto un membro resta una coppia; tolti tutti si scioglie
    const coppia = impostaSuperserie(tri, 1, [0]) as Prescrizione[]
    expect(coppia.filter((x) => x.superserie).map((x) => x.esercizioId)).toEqual(['panca_piana', 'curl_manubri'])
    const sciolta = impostaSuperserie(coppia, 1, []) as Prescrizione[]
    expect(sciolta.every((x) => !x.superserie && x.recuperoSec)).toBe(true)
  })

  it('normalizza un gruppo di un solo esercizio', () => {
    expect((normalizzaSuperserie([P('panca_piana', { superserie: 'B', recuperoSec: 0 })])[0] as Prescrizione).superserie).toBeUndefined()
  })
})

describe('tempo o ripetizioni', () => {
  it('la prescrizione sceglie la misura', () => {
    const push = esercizio('push_up')
    expect(modoRegistrazione(push, P('push_up'))).toBe('ripetizioni')
    const aTempo = conMisura(P('push_up'), 'tempo')
    expect(aTempo.ripetizioni).toBeUndefined()
    expect(modoRegistrazione(push, aTempo)).toBe('tempo')
    const plank = esercizio('plank')
    expect(modoRegistrazione(plank, conMisura({ esercizioId: 'plank', serie: 3, durataSec: 30 }, 'ripetizioni'))).toBe('ripetizioni')
    // le corse e le distanze non cambiano
    expect(modoRegistrazione(esercizio('farmer_carry'), { esercizioId: 'farmer_carry', durataSec: 30 })).toBe('distanza')
    expect(conMisura(P('push_up', { ripetizioni: '8 per lato' }), 'tempo').durataSec).toBe('30 per lato')
  })

  it('lo storico riconosce le serie a tempo', () => {
    expect(modoDaSerie(esercizio('push_up'), [{ ripetizioni: null, durataSec: 40 }])).toBe('tempo')
    expect(modoDaSerie(esercizio('push_up'), [{ ripetizioni: 10, durataSec: null }])).toBe('ripetizioni')
  })
})
