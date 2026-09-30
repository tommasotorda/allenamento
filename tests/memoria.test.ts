import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { AllenamentoDB } from '../src/db/schema'
import { programma } from '../src/domain/data'
import { valoriPrecompilati } from '../src/domain/progression'
import type { Memoria, Prescrizione, Serie } from '../src/domain/types'

const base = programma.fasi[0]
const p: Prescrizione = { esercizioId: 'trap_bar_deadlift', serie: 5, ripetizioni: '3-5', rpe: 'fase', recuperoSec: 150 }
const serie = (numero: number, caricoKg: number, ripetizioni = 5): Serie => ({ id: String(numero), sedutaId: 'x', esercizioId: p.esercizioId, data: '2026-09-01', numero, ripetizioni, caricoKg, durataSec: null, distanzaM: null, lato: null, rpe: 7 })

describe('precompilazione', () => {
  it('senza storia usa la prescrizione della scheda', () => {
    expect(valoriPrecompilati(1, { precedenti: [], p, fase: base })).toEqual({ caricoKg: null, ripetizioni: 3, durataSec: null, distanzaM: null, rpe: null })
  })

  it("la memoria vince sull'ultima seduta, serie per serie", () => {
    const memoria: Memoria = { chiave: 'es:trap_bar_deadlift', serie: [{ caricoKg: 110, ripetizioni: 5, durataSec: null, distanzaM: null, rpe: 7 }, { caricoKg: 112.5, ripetizioni: 4, durataSec: null, distanzaM: null, rpe: 8 }], aggiornata: '' }
    const opts = { memoria, precedenti: [serie(1, 100)], p, fase: base }
    expect(valoriPrecompilati(1, opts)).toMatchObject({ caricoKg: 110, ripetizioni: 5, rpe: 7 })
    expect(valoriPrecompilati(2, opts)).toMatchObject({ caricoKg: 112.5, ripetizioni: 4 })
    // serie oltre quelle ricordate: l'ultima ricordata
    expect(valoriPrecompilati(5, opts)).toMatchObject({ caricoKg: 112.5 })
  })

  it("senza memoria usa l'ultima seduta", () => {
    expect(valoriPrecompilati(2, { precedenti: [serie(1, 100), serie(2, 105)], p, fase: base })).toMatchObject({ caricoKg: 105, ripetizioni: 5, rpe: null })
  })

  it("dopo il reset riparte dalla scheda anche se c'e' storia", () => {
    const memoria: Memoria = { chiave: 'es:trap_bar_deadlift', azzerata: true, aggiornata: '' }
    expect(valoriPrecompilati(1, { memoria, precedenti: [serie(1, 100)], p, fase: base })).toMatchObject({ caricoKg: null, ripetizioni: 3 })
  })

  it('il carico suggerito si applica solo se accettato', () => {
    expect(valoriPrecompilati(1, { precedenti: [serie(1, 100)], p, fase: base, caricoApplicato: 102.5 }).caricoKg).toBe(102.5)
  })
})

describe('memoria su database', () => {
  it('ogni serie salvata diventa il valore precompilato; il reset la azzera', async () => {
    const db = new AllenamentoDB('test-memoria')
    // import dinamico: repositories usa il database dell'app, qui si prova la stessa logica sul db di test
    const { salvaSerieRicordando, azzeraMemoria, chiaveEs } = await import('../src/db/repositories')
    const { db: dbApp } = await import('../src/db/schema')
    await salvaSerieRicordando(serie(1, 100))
    await salvaSerieRicordando(serie(3, 107.5))
    const m = await dbApp.memoria.get(chiaveEs(p.esercizioId))
    expect(m?.serie?.map((x) => x.caricoKg)).toEqual([100, 100, 107.5])
    expect(await dbApp.serie.count()).toBe(2)
    await azzeraMemoria(p.esercizioId)
    expect((await dbApp.memoria.get(chiaveEs(p.esercizioId)))?.azzerata).toBe(true)
    // dopo il reset la prima serie salvata riparte da zero
    await salvaSerieRicordando(serie(1, 90))
    expect((await dbApp.memoria.get(chiaveEs(p.esercizioId)))?.serie?.map((x) => x.caricoKg)).toEqual([90])
    db.close()
  })
})
