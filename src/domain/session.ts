import { haBloccoCore, varianteCore } from './calendar'
import type { Fase, GiornoId, Prescrizione, Programma, VocePalestra } from './types'

export interface StrutturaSeduta {
  giorno: GiornoId
  nome: string
  core?: { variante: 'A' | 'B'; voci: Prescrizione[] }
  pista?: { esercizioId: string; testo: string; ripetute: number | null; scarico: boolean }
  attivita?: { tipo: string; durataMin: number }
  palestra: VocePalestra[]
  mobilita: Prescrizione[]
}

/** Seduta del giorno risolta per la settimana e la fase correnti, con gli sbloccabili attivi. */
export function strutturaSeduta(programma: Programma, giorno: GiornoId, settimana: number, fase: Fase, sbloccati: string[]): StrutturaSeduta {
  const s = programma.sedute[giorno]
  const out: StrutturaSeduta = { giorno, nome: s.nome, palestra: [], mobilita: s.mobilita ?? [] }

  if (haBloccoCore(giorno)) {
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
