/** Profili standard: risposte preimpostate del questionario, da cui si genera la scheda. */
import type { Risposte } from './generator'

export interface ProfiloStandard {
  id: string
  nome: string
  risposte: Risposte
}

export const PROFILI: ProfiloStandard[] = [
  {
    id: 'principiante',
    nome: 'Total body principiante',
    risposte: { obiettivi: ['stabilita', 'forza'], livello: 1, giorni: ['lun', 'mer', 'ven'], durataMin: 45, attrezzi: ['manubri', 'elastico', 'kettlebell'], corsa: false, evitare: [], focus: [] },
  },
  {
    id: 'forza',
    nome: 'Forza in palestra',
    risposte: { obiettivi: ['forza', 'massa'], livello: 2, giorni: ['lun', 'mar', 'gio', 'ven'], durataMin: 60, attrezzi: ['bilanciere', 'panca', 'manubri', 'sbarra', 'cavo', 'trap-bar', 'kettlebell', 'elastico', 'box'], corsa: false, evitare: [], focus: [] },
  },
  {
    id: 'funzionale',
    nome: 'Funzionale e atletico',
    risposte: { obiettivi: ['potenza', 'stabilita', 'resistenza'], livello: 2, giorni: ['lun', 'mar', 'gio', 'sab'], durataMin: 60, attrezzi: ['kettlebell', 'manubri', 'palla-medica', 'box', 'trx', 'elastico', 'sbarra', 'slitta'], corsa: true, evitare: [], focus: ['core'] },
  },
  {
    id: 'resistenza',
    nome: 'Resistenza e condizionamento',
    risposte: { obiettivi: ['resistenza', 'stabilita'], livello: 2, giorni: ['lun', 'mer', 'ven'], durataMin: 45, attrezzi: ['kettlebell', 'manubri', 'battle-rope', 'box', 'elastico'], corsa: true, evitare: [], focus: [] },
  },
  {
    id: 'postura',
    nome: 'Catena posteriore e postura',
    risposte: { obiettivi: ['stabilita', 'mobilita', 'forza'], livello: 1, giorni: ['lun', 'mer', 'ven'], durataMin: 45, attrezzi: ['manubri', 'elastico', 'cavo', 'panca', 'panca-iperestensioni', 'kettlebell'], corsa: false, evitare: [], focus: ['catena-posteriore', 'schiena-spalle', 'core'] },
  },
  {
    id: 'mobilita',
    nome: 'Mobilità e yoga',
    risposte: { obiettivi: ['mobilita', 'stabilita'], livello: 1, giorni: ['mar', 'gio', 'sab'], durataMin: 45, attrezzi: ['elastico'], corsa: false, evitare: [], focus: ['core'] },
  },
  {
    id: 'casa',
    nome: 'Corpo libero a casa',
    risposte: { obiettivi: ['resistenza', 'stabilita', 'forza'], livello: 1, giorni: ['lun', 'mer', 'ven'], durataMin: 30, attrezzi: ['elastico'], corsa: false, evitare: [], focus: [] },
  },
]
