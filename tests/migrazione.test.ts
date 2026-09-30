import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { AllenamentoDB } from '../src/db/schema'

describe('migrazione del database', () => {
  it('dalla versione 2 crea il piano originale con le modifiche esistenti', async () => {
    // database come lo lasciava la versione precedente dell'app
    const vecchio = new Dexie('migra')
    vecchio.version(2).stores({
      impostazioni: 'chiave', misure: '++id, data', sedute: 'id, data, templateId', serie: 'id, sedutaId, esercizioId, data',
      risultatiTest: '++id, testId, data', fotoEsercizi: '++id, esercizioId', schede: 'chiave',
    })
    await vecchio.table('impostazioni').put({ chiave: 'singleton', cicloInizio: '2026-09-07', sbloccati: [], incrementoCaricoKg: 2.5 })
    await vecchio.table('schede').put({ chiave: 'singleton', sedute: { gio: { palestra: [{ esercizioId: 'panca_piana', serie: 4 }] } } })
    vecchio.close()

    const db = new AllenamentoDB('migra')
    const piani = await db.piani.toArray()
    expect(piani).toHaveLength(1)
    expect(piani[0].inizio).toBe('2026-09-07')
    expect(piani[0].programma.sedute.gio.palestra).toEqual([{ esercizioId: 'panca_piana', serie: 4 }])
    expect((await db.impostazioni.get('singleton'))?.pianoAttivo).toBe(piani[0].id)
  })
})
