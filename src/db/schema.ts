import Dexie, { type EntityTable } from 'dexie'
import { isoLocale } from '../domain/calendar'
import { pianoOriginale, type SchedaLegacy } from '../domain/plans'
import type { FotoEsercizio, Impostazioni, Memoria, Misura, Piano, ProfiloUtente, RisultatoTest, SedutaLog, Serie } from '../domain/types'

export class AllenamentoDB extends Dexie {
  impostazioni!: EntityTable<Impostazioni, 'chiave'>
  misure!: EntityTable<Misura, 'id'>
  sedute!: EntityTable<SedutaLog, 'id'>
  serie!: EntityTable<Serie, 'id'>
  risultatiTest!: EntityTable<RisultatoTest, 'id'>
  fotoEsercizi!: EntityTable<FotoEsercizio, 'id'>
  /** solo per migrare la versione 2 */
  schede!: EntityTable<SchedaLegacy & { chiave: string }, 'chiave'>
  piani!: EntityTable<Piano, 'id'>
  profili!: EntityTable<ProfiloUtente, 'id'>
  memoria!: EntityTable<Memoria, 'chiave'>

  constructor(nome = 'allenamento') {
    super(nome)
    this.version(1).stores({
      impostazioni: 'chiave',
      misure: '++id, data',
      sedute: 'id, data, templateId',
      serie: 'id, sedutaId, esercizioId, data',
      risultatiTest: '++id, testId, data',
      fotoEsercizi: '++id, esercizioId',
    })
    // v2: scheda personalizzata
    this.version(2).stores({ schede: 'chiave' })
    // v3: piani multipli; le modifiche della v2 confluiscono nel "Piano originale"
    this.version(3)
      .stores({ piani: 'id', profili: 'id' })
      .upgrade(async (tx) => {
        const imp = await tx.table('impostazioni').get('singleton')
        const legacy = await tx.table('schede').get('singleton')
        const p = pianoOriginale(imp?.cicloInizio ?? isoLocale(), legacy)
        await tx.table('piani').put(p)
        if (imp) await tx.table('impostazioni').put({ ...imp, pianoAttivo: p.id })
        await tx.table('schede').clear()
      })
    // v4: memoria per l'autocompilazione
    this.version(4).stores({ memoria: 'chiave' })
  }
}

export const db = new AllenamentoDB()
