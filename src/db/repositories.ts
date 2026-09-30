import { isoLocale, lunediDi } from '../domain/calendar'
import type { Bozza } from '../domain/progression'
import type { Impostazioni, Memoria, Misura, Piano, ProfiloUtente, Programma, RisultatoTest, SedutaLog, Serie } from '../domain/types'
import { db } from './schema'

import { uuid } from '../domain/util'
export { uuid }

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

export async function iniziaSeduta(piano: Piano, templateId: string, settimanaCiclo: number, data = isoLocale()): Promise<SedutaLog> {
  const s: SedutaLog = {
    id: uuid(),
    data,
    templateId,
    pianoId: piano.id,
    nomeSeduta: piano.programma.sedute[templateId]?.nome,
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

// ---- Piani e profili ----

/** Piano attivo; se manca attiva il primo non archiviato. Senza piani non crea nulla: l'utente ne sceglie o crea uno. */
export async function assicuraPianoAttivo(): Promise<Piano | undefined> {
  const imp = await leggiImpostazioni()
  const attivo = imp.pianoAttivo ? await db.piani.get(imp.pianoAttivo) : undefined
  if (attivo) return attivo
  const primo = await db.piani.filter((p) => !p.archiviato).first()
  if (!primo) return undefined
  await aggiornaImpostazioni({ pianoAttivo: primo.id })
  return primo
}

/** Salva e (di default) rende attivo un piano. */
export async function salvaPiano(p: Piano, attiva = true) {
  await db.piani.put(p)
  if (attiva) await aggiornaImpostazioni({ pianoAttivo: p.id })
}

export async function attivaPiano(id: string) {
  const p = await db.piani.get(id)
  if (p?.archiviato) await db.piani.update(id, { archiviato: false })
  await aggiornaImpostazioni({ pianoAttivo: id })
}

export const aggiornaPiano = (id: string, patch: Partial<Piano>) => db.piani.update(id, patch)
export const aggiornaProgramma = (id: string, programma: Programma) => db.piani.update(id, { programma })

export async function eliminaPiano(id: string) {
  await db.piani.delete(id)
}

/** Ricomincia da zero: elimina tutte le schede. Storico, misure e profili restano; una seduta lasciata aperta viene chiusa. */
export async function eliminaTutteLeSchede() {
  await db.transaction('rw', db.piani, db.impostazioni, db.sedute, async () => {
    await db.piani.clear()
    await db.sedute.filter((s) => s.fine === null).modify({ fine: new Date().toISOString() })
    await aggiornaImpostazioni({ pianoAttivo: undefined })
  })
}

export const salvaProfilo = (p: ProfiloUtente) => db.profili.put(p)
export const eliminaProfilo = (id: string) => db.profili.delete(id)

// ---- Memoria dell'autocompilazione ----

export const chiaveEs = (id: string) => `es:${id}`
export const chiavePista = (id: string) => `pista:${id}`
/** la chiave `tennis` resta per i dati gia' salvati */
export const chiaveAttivita = (tipo: string) => (tipo === 'tennis' ? 'tennis' : `attivita:${tipo}`)

/** Registra una serie e la ricorda come valore precompilato per la prossima volta. */
export async function salvaSerieRicordando(s: Serie) {
  await db.transaction('rw', db.serie, db.memoria, async () => {
    await db.serie.put(s)
    const m = await db.memoria.get(chiaveEs(s.esercizioId))
    const serie = m && !m.azzerata ? [...(m.serie ?? [])] : []
    const { ripetizioni, caricoKg, durataSec, distanzaM, rpe } = s
    serie[s.numero - 1] = { ripetizioni, caricoKg, durataSec, distanzaM, rpe }
    // eventuali buchi (serie saltate) prendono il valore precedente
    for (let i = 0; i < serie.length; i++) if (!serie[i]) serie[i] = serie[i - 1] ?? serie[s.numero - 1]
    await db.memoria.put({ chiave: chiaveEs(s.esercizioId), serie, aggiornata: new Date().toISOString() })
  })
}

export async function ricordaPista(esercizioId: string, pista: SedutaLog['pista']) {
  if (Object.values(pista).every((v) => v === null)) return
  await db.memoria.put({ chiave: chiavePista(esercizioId), pista, aggiornata: new Date().toISOString() })
}

export async function ricordaAttivita(tipo: string, minuti: number) {
  await db.memoria.put({ chiave: chiaveAttivita(tipo), minuti, aggiornata: new Date().toISOString() })
}

/** Reset di un esercizio: la prossima seduta riparte dai valori della scheda. */
export async function azzeraMemoria(esercizioId: string) {
  await db.memoria.put({ chiave: chiaveEs(esercizioId), azzerata: true, aggiornata: new Date().toISOString() })
}

/** Reset di tutta l'autocompilazione. */
export async function azzeraTuttaMemoria() {
  const ids = new Set<string>([...(await db.serie.orderBy('esercizioId').uniqueKeys()).map(String)])
  for (const m of await db.memoria.toArray()) if (m.chiave.startsWith('es:')) ids.add(m.chiave.slice(3))
  const ora = new Date().toISOString()
  await db.transaction('rw', db.memoria, async () => {
    await db.memoria.clear()
    await db.memoria.bulkPut([...ids].map((id): Memoria => ({ chiave: chiaveEs(id), azzerata: true, aggiornata: ora })))
  })
}

export type { Bozza }
