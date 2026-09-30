import { pianoOriginale, type SchedaLegacy } from '../domain/plans'
import type { FotoEsercizio, Impostazioni, Misura, Piano, ProfiloUtente, RisultatoTest, SedutaLog, Serie } from '../domain/types'
import { AllenamentoDB } from './schema'

export const VERSIONE_BACKUP = 3

export interface Backup {
  app: 'allenamento'
  versione: number
  esportato: string
  impostazioni: Impostazioni[]
  misure: Misura[]
  sedute: SedutaLog[]
  serie: Serie[]
  risultatiTest: RisultatoTest[]
  fotoEsercizi: (Omit<FotoEsercizio, 'blob'> & { tipo: string; base64: string })[]
  /** solo versione 2 */
  schede?: SchedaLegacy[]
  /** dalla versione 3 */
  piani?: Piano[]
  profili?: ProfiloUtente[]
}

async function blobInBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  const passo = 0x8000
  for (let i = 0; i < bytes.length; i += passo) bin += String.fromCharCode(...bytes.subarray(i, i + passo))
  return btoa(bin)
}

function base64InBlob(s: string, tipo: string): Blob {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

export async function esporta(db: AllenamentoDB): Promise<Backup> {
  const foto = await db.fotoEsercizi.toArray()
  return {
    app: 'allenamento',
    versione: VERSIONE_BACKUP,
    esportato: new Date().toISOString(),
    impostazioni: await db.impostazioni.toArray(),
    misure: await db.misure.toArray(),
    sedute: await db.sedute.toArray(),
    serie: await db.serie.toArray(),
    risultatiTest: await db.risultatiTest.toArray(),
    piani: await db.piani.toArray(),
    profili: await db.profili.toArray(),
    fotoEsercizi: await Promise.all(
      foto.map(async ({ blob, ...resto }) => ({ ...resto, tipo: blob.type || 'image/jpeg', base64: await blobInBase64(blob) })),
    ),
  }
}

export function validaBackup(x: unknown): asserts x is Backup {
  const b = x as Partial<Backup>
  if (!b || b.app !== 'allenamento' || typeof b.versione !== 'number') throw new Error('File non valido')
  if (b.versione > VERSIONE_BACKUP) throw new Error('Versione del file non supportata')
  for (const k of ['impostazioni', 'misure', 'sedute', 'serie', 'risultatiTest', 'fotoEsercizi'] as const) {
    if (!Array.isArray(b[k])) throw new Error(`Campo mancante: ${k}`)
  }
}

/** Sostituisce tutti i dati con quelli del backup. */
export async function importa(db: AllenamentoDB, dati: unknown) {
  validaBackup(dati)
  await db.transaction('rw', [db.impostazioni, db.misure, db.sedute, db.serie, db.risultatiTest, db.fotoEsercizi, db.schede, db.piani, db.profili], async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.impostazioni.bulkAdd(dati.impostazioni)
    await db.misure.bulkAdd(dati.misure)
    await db.sedute.bulkAdd(dati.sedute)
    await db.serie.bulkAdd(dati.serie)
    await db.risultatiTest.bulkAdd(dati.risultatiTest)
    // i backup precedenti ai piani multipli diventano il "Piano originale"
    let piani = dati.piani ?? []
    const imp = dati.impostazioni[0]
    if (dati.versione < 3) {
      const p = pianoOriginale(imp?.cicloInizio ?? new Date().toISOString().slice(0, 10), dati.schede?.[0])
      piani = [p]
      if (imp) dati.impostazioni = [{ ...imp, pianoAttivo: p.id }]
      await db.impostazioni.clear()
      await db.impostazioni.bulkAdd(dati.impostazioni)
    }
    await db.piani.bulkAdd(piani)
    await db.profili.bulkAdd(dati.profili ?? [])
    await db.fotoEsercizi.bulkAdd(dati.fotoEsercizi.map(({ tipo, base64, ...resto }) => ({ ...resto, blob: base64InBlob(base64, tipo) })))
  })
}

export function nomeFileBackup(d = new Date()): string {
  return `allenamento-backup-${d.toISOString().slice(0, 10)}.json`
}
