import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { esporta, importa } from '../src/db/backup'
import { AllenamentoDB } from '../src/db/schema'

describe('backup', () => {
  it('export seguito da import su un database vuoto ripristina tutto, foto incluse', async () => {
    const a = new AllenamentoDB('test-a')
    await a.impostazioni.put({ chiave: 'singleton', cicloInizio: '2026-09-07', sbloccati: ['box_squat'], incrementoCaricoKg: 2.5 })
    await a.misure.add({ data: '2026-09-29', pesoKg: 96.4, vitaCm: null, fcRiposoBpm: 47, doloreGinocchio: 2 })
    await a.sedute.add({ id: 's1', data: '2026-09-29', templateId: 'mar', settimanaCiclo: 4, inizio: '2026-09-29T17:00:00Z', fine: '2026-09-29T18:10:00Z', pista: { durataMin: 30, distanzaM: null, fcMedia: 135, ripetuteFatte: null }, tennisMin: null })
    await a.serie.add({ id: 'x1', sedutaId: 's1', esercizioId: 'step_up_basso', data: '2026-09-29', numero: 1, ripetizioni: 8, caricoKg: 10, durataSec: null, distanzaM: null, lato: null, rpe: 7 })
    await a.risultatiTest.add({ testId: 'cooper', data: '2026-09-29', valore: 2350 })
    await a.schede.put({ chiave: 'singleton', sedute: { lun: { palestra: [{ esercizioId: 'push_up', serie: 3, ripetizioni: '10' }] } }, modificata: '2026-09-30T10:00:00Z' })
    const bytes = new Uint8Array([255, 216, 255, 0, 1, 2, 3, 250])
    await a.fotoEsercizi.add({ esercizioId: 'plank', blob: new Blob([bytes], { type: 'image/jpeg' }), creata: '2026-09-29T10:00:00Z' })

    const json = JSON.parse(JSON.stringify(await esporta(a)))

    const b = new AllenamentoDB('test-b')
    await b.misure.add({ data: '2020-01-01', pesoKg: 1, vitaCm: null, fcRiposoBpm: null, doloreGinocchio: null })
    await importa(b, json)

    expect(await b.impostazioni.get('singleton')).toEqual(await a.impostazioni.get('singleton'))
    expect(await b.misure.toArray()).toEqual(await a.misure.toArray())
    expect(await b.sedute.toArray()).toEqual(await a.sedute.toArray())
    expect(await b.serie.toArray()).toEqual(await a.serie.toArray())
    expect(await b.risultatiTest.toArray()).toEqual(await a.risultatiTest.toArray())
    expect(await b.schede.toArray()).toEqual(await a.schede.toArray())
    const foto = await b.fotoEsercizi.toArray()
    expect(foto).toHaveLength(1)
    expect(foto[0].blob.type).toBe('image/jpeg')
    expect(new Uint8Array(await foto[0].blob.arrayBuffer())).toEqual(bytes)
  })

  it('importa i backup della versione 1 (senza scheda personalizzata)', async () => {
    const d = new AllenamentoDB('test-d')
    await importa(d, { app: 'allenamento', versione: 1, esportato: '', impostazioni: [], misure: [], sedute: [], serie: [], risultatiTest: [], fotoEsercizi: [] })
    expect(await d.schede.count()).toBe(0)
  })

  it('rifiuta file non validi senza toccare i dati', async () => {
    const c = new AllenamentoDB('test-c')
    await c.misure.add({ data: '2026-01-01', pesoKg: 90, vitaCm: null, fcRiposoBpm: null, doloreGinocchio: null })
    await expect(importa(c, { app: 'altro' })).rejects.toThrow()
    expect(await c.misure.count()).toBe(1)
  })
})
