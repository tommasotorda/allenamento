import { isoLocale, lunediDi } from '../domain/calendar'
import type { GiornoId, Impostazioni, Misura, RisultatoTest, SedutaLog, Serie } from '../domain/types'
import { db } from './schema'

export const uuid = () => crypto.randomUUID()

// ---- Impostazioni ----

export function impostazioniDefault(oggi = isoLocale()): Impostazioni {
  return { chiave: 'singleton', cicloInizio: lunediDi(oggi), sbloccati: [], incrementoCaricoKg: 2.5 }
}

/** Legge le impostazioni creandole al primo utilizzo. */
export async function leggiImpostazioni(): Promise<Impostazioni> {
  const i = await db.impostazioni.get('singleton')
  if (i) return i
  const def = impostazioniDefault()
  await db.impostazioni.put(def)
  return def
}

export async function aggiornaImpostazioni(patch: Partial<Omit<Impostazioni, 'chiave'>>) {
  const i = await leggiImpostazioni()
  await db.impostazioni.put({ ...i, ...patch })
}

// ---- Misure ----

export async function salvaMisura(m: Misura) {
  // una misura per giorno: i campi nuovi sovrascrivono quelli esistenti
  const esistente = await db.misure.where('data').equals(m.data).first()
  if (esistente) {
    const unita: Misura = { ...esistente }
    for (const k of ['pesoKg', 'vitaCm', 'fcRiposoBpm', 'doloreGinocchio'] as const) {
      if (m[k] !== null) unita[k] = m[k]
    }
    await db.misure.put(unita)
  } else {
    await db.misure.add(m)
  }
}

export const eliminaMisura = (id: number) => db.misure.delete(id)

// ---- Sedute e serie ----

export async function iniziaSeduta(templateId: GiornoId, settimanaCiclo: number, data = isoLocale()): Promise<SedutaLog> {
  const s: SedutaLog = {
    id: uuid(),
    data,
    templateId,
    settimanaCiclo,
    inizio: new Date().toISOString(),
    fine: null,
    pista: { durataMin: null, distanzaM: null, fcMedia: null, ripetuteFatte: null },
    tennisMin: null,
  }
  await db.sedute.add(s)
  return s
}

/** Seduta di oggi non ancora terminata, se esiste. */
export async function sedutaAperta(data = isoLocale()): Promise<SedutaLog | undefined> {
  const oggi = await db.sedute.where('data').equals(data).toArray()
  return oggi.find((s) => s.fine === null)
}

export const aggiornaSeduta = (id: string, patch: Partial<SedutaLog>) => db.sedute.update(id, patch)

export async function terminaSeduta(id: string) {
  await db.sedute.update(id, { fine: new Date().toISOString() })
}

export async function eliminaSeduta(id: string) {
  await db.transaction('rw', db.sedute, db.serie, async () => {
    await db.serie.where('sedutaId').equals(id).delete()
    await db.sedute.delete(id)
  })
}

export const salvaSerie = (s: Serie) => db.serie.put(s)
export const eliminaSerie = (id: string) => db.serie.delete(id)

/** Serie registrate per un esercizio nell'ultima seduta precedente a quella indicata. */
export async function serieUltimaSeduta(esercizioId: string, esclusaSedutaId?: string): Promise<Serie[]> {
  const tutte = await db.serie.where('esercizioId').equals(esercizioId).toArray()
  const altre = tutte.filter((s) => s.sedutaId !== esclusaSedutaId)
  if (altre.length === 0) return []
  const sedute = await db.sedute.bulkGet([...new Set(altre.map((s) => s.sedutaId))])
  const chiave = (s: SedutaLog) => `${s.data}|${s.inizio}`
  const valide = sedute.filter((s): s is SedutaLog => !!s)
  if (valide.length === 0) return []
  const ultima = valide.reduce((a, b) => (chiave(b) > chiave(a) ? b : a))
  return altre.filter((s) => s.sedutaId === ultima.id).sort((a, b) => a.numero - b.numero)
}

// ---- Test ----

export const salvaRisultatoTest = (r: RisultatoTest) => db.risultatiTest.add(r)
export const eliminaRisultatoTest = (id: number) => db.risultatiTest.delete(id)

// ---- Foto ----

export async function aggiungiFoto(esercizioId: string, file: Blob) {
  const blob = await ridimensiona(file, 1200)
  await db.fotoEsercizi.add({ esercizioId, blob, creata: new Date().toISOString() })
}

export const eliminaFoto = (id: number) => db.fotoEsercizi.delete(id)

/** JPEG ridimensionato a max `lato` px sul lato lungo. */
async function ridimensiona(file: Blob, lato: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scala = Math.min(1, lato / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scala)
  const h = Math.round(bmp.height * scala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.85))
}
