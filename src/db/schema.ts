import Dexie, { type EntityTable } from 'dexie'
import type { SchedaUtente } from '../domain/editing'
import type { FotoEsercizio, Impostazioni, Misura, RisultatoTest, SedutaLog, Serie } from '../domain/types'

export class AllenamentoDB extends Dexie {
  impostazioni!: EntityTable<Impostazioni, 'chiave'>
  misure!: EntityTable<Misura, 'id'>
  sedute!: EntityTable<SedutaLog, 'id'>
  serie!: EntityTable<Serie, 'id'>
  risultatiTest!: EntityTable<RisultatoTest, 'id'>
  fotoEsercizi!: EntityTable<FotoEsercizio, 'id'>
  schede!: EntityTable<SchedaUtente, 'chiave'>

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
  }
}

export const db = new AllenamentoDB()
