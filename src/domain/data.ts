import exercisesJson from '../data/exercises.json'
import programJson from '../data/program.json'
import testsJson from '../data/tests.json'
import type { Esercizio, GiornoId, Programma, TestDef } from './types'

export const esercizi = exercisesJson as unknown as Esercizio[]
export const programma = programJson as unknown as Programma
export const tests = testsJson as TestDef[]

const perId = new Map(esercizi.map((e) => [e.id, e]))

export function esercizio(id: string): Esercizio {
  const e = perId.get(id)
  if (!e) throw new Error(`Esercizio sconosciuto: ${id}`)
  return e
}

export const GIORNI: GiornoId[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export const NOMI_GIORNI: Record<GiornoId, string> = {
  lun: 'Lunedì',
  mar: 'Martedì',
  mer: 'Mercoledì',
  gio: 'Giovedì',
  ven: 'Venerdì',
  sab: 'Sabato',
  dom: 'Domenica',
}

export const CATEGORIE = ['core', 'forza', 'ricostruzione', 'potenza', 'pista', 'mobilita', 'stretching', 'yoga'] as const

export const NOMI_CATEGORIE: Record<(typeof CATEGORIE)[number], string> = {
  core: 'Core',
  forza: 'Forza',
  ricostruzione: 'Ricostruzione',
  potenza: 'Potenza',
  pista: 'Pista',
  mobilita: 'Mobilità',
  stretching: 'Stretching',
  yoga: 'Yoga',
}
