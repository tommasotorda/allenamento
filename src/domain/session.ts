import { varianteCore } from './calendar'
import type { Fase, GiornoId, Prescrizione, Programma, VocePalestra } from './types'

export interface StrutturaSeduta {
  sedutaId: string
  nome: string
  core?: { variante: 'A' | 'B'; voci: Prescrizione[] }
  pista?: { esercizioId: string; testo: string; ripetute: number | null; scarico: boolean }
  attivita?: { tipo: string; durataMin: number }
  riscaldamento: Prescrizione[]
  palestra: VocePalestra[]
  mobilita: Prescrizione[]
}

/** Seduta del giorno risolta per la settimana e la fase correnti, con gli sbloccabili attivi. */
export function strutturaSeduta(programma: Programma, sedutaId: string, settimana: number, fase: Fase, sbloccati: string[]): StrutturaSeduta {
  const s = programma.sedute[sedutaId]
  const out: StrutturaSeduta = { sedutaId, nome: s.nome, riscaldamento: s.riscaldamento ?? [], palestra: [], mobilita: s.mobilita ?? [] }

  if (s.core) {
    const v = varianteCore(programma, settimana)
    out.core = { variante: v.nome, voci: v.esercizi }
  }

  if (s.pista) {
    const usaScarico = fase.scarico && !!s.pista.scarico
    const soglia = s.pista.esercizioId === 'ripetute_soglia'
    out.pista = {
      esercizioId: s.pista.esercizioId,
      testo: usaScarico ? s.pista.scarico! : s.pista.prescrizione,
      ripetute: soglia && !usaScarico ? fase.serieSoglia : null,
      scarico: usaScarico,
    }
  }

  if (s.attivita) out.attivita = s.attivita

  let palestra = [...(s.palestra ?? [])]
  for (const sb of s.sbloccabili ?? []) {
    if (!sbloccati.includes(sb.esercizioId)) continue
    const i = sb.sostituisce ? palestra.findIndex((v) => 'esercizioId' in v && v.esercizioId === sb.sostituisce) : -1
    if (i >= 0) palestra = palestra.map((v, k) => (k === i ? sb : v))
    else palestra.push(sb)
  }
  out.palestra = palestra
  return out
}

/** Sedute del programma nell'ordine della settimana, con i giorni in cui sono previste. */
export function elencoSedute(programma: Programma): { sedutaId: string; nome: string; giorni: GiornoId[] }[] {
  const ordine: GiornoId[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
  const visti = new Map<string, GiornoId[]>()
  for (const g of ordine) {
    for (const x of programma.settimana.filter((y) => y.giorno === g)) visti.set(x.sedutaId, [...(visti.get(x.sedutaId) ?? []), g])
  }
  for (const id of Object.keys(programma.sedute)) if (!visti.has(id)) visti.set(id, [])
  return [...visti.entries()].filter(([id]) => programma.sedute[id]).map(([sedutaId, giorni]) => ({ sedutaId, nome: programma.sedute[sedutaId].nome, giorni }))
}

/** Nome di una seduta registrata (anche di piani eliminati o dati precedenti). */
export function nomeSedutaLog(log: { templateId: string; nomeSeduta?: string }, programmaBase: Programma): string {
  return log.nomeSeduta ?? programmaBase.sedute[log.templateId]?.nome ?? log.templateId
}

/** "calcio + padel" -> "Calcio + padel" */
export const nomeAttivita = (tipo: string) => tipo.charAt(0).toUpperCase() + tipo.slice(1)

/** Etichette delle superserie in un elenco di voci: "A1", "A2"... e se la voce apre la coppia. */
export function etichetteSuperserie(voci: VocePalestra[]): Map<number, { etichetta: string; ultimo: boolean }> {
  const out = new Map<number, { etichetta: string; ultimo: boolean }>()
  const perGruppo = new Map<string, number[]>()
  voci.forEach((v, i) => {
    if ('circuito' in v || !v.superserie) return
    perGruppo.set(v.superserie, [...(perGruppo.get(v.superserie) ?? []), i])
  })
  for (const [g, idx] of perGruppo) {
    if (idx.length < 2) continue
    idx.forEach((i, k) => out.set(i, { etichetta: `${g}${k + 1}`, ultimo: k === idx.length - 1 }))
  }
  return out
}
