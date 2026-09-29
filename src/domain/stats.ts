import { giorniTra, lunediDi } from './calendar'
import type { Misura, Serie } from './types'

/** Epley: carico × (1 + ripetizioni/30), solo per serie con ripetizioni <= 10. */
export function epley(caricoKg: number, ripetizioni: number): number | null {
  if (ripetizioni < 1 || ripetizioni > 10) return null
  if (ripetizioni === 1) return caricoKg
  return caricoKg * (1 + ripetizioni / 30)
}

/**
 * Media mobile del peso: per ogni giorno con una misura, media delle misure negli
 * ultimi 7 giorni (giorno incluso) se sono almeno 3, altrimenti null.
 */
export function mediaMobilePeso(misure: Misura[]): { data: string; peso: number; media: number | null }[] {
  const conPeso = misure
    .filter((m): m is Misura & { pesoKg: number } => m.pesoKg !== null)
    .sort((a, b) => a.data.localeCompare(b.data))
  return conPeso.map((m) => {
    const finestra = conPeso.filter((x) => {
      const d = giorniTra(x.data, m.data)
      return d >= 0 && d < 7
    })
    const media = finestra.length >= 3 ? finestra.reduce((s, x) => s + x.pesoKg, 0) / finestra.length : null
    return { data: m.data, peso: m.pesoKg, media }
  })
}

/** Miglior serie per seduta (1RM stimato piu' alto, a parita' carico piu' alto). */
export function miglioriSeriePerSeduta(serie: Serie[]): { data: string; sedutaId: string; caricoKg: number; ripetizioni: number; e1rm: number | null }[] {
  const perSeduta = new Map<string, Serie[]>()
  for (const s of serie) {
    if (s.caricoKg === null || s.ripetizioni === null) continue
    const arr = perSeduta.get(s.sedutaId) ?? []
    arr.push(s)
    perSeduta.set(s.sedutaId, arr)
  }
  const out = [...perSeduta.entries()].map(([sedutaId, arr]) => {
    const best = arr.reduce((a, b) => {
      const ea = epley(a.caricoKg!, a.ripetizioni!) ?? 0
      const eb = epley(b.caricoKg!, b.ripetizioni!) ?? 0
      if (eb !== ea) return eb > ea ? b : a
      return b.caricoKg! > a.caricoKg! ? b : a
    })
    return {
      data: best.data,
      sedutaId,
      caricoKg: best.caricoKg!,
      ripetizioni: best.ripetizioni!,
      e1rm: epley(best.caricoKg!, best.ripetizioni!),
    }
  })
  return out.sort((a, b) => a.data.localeCompare(b.data))
}

/** Volume (kg × ripetizioni) raggruppato per settimana (lunedi'). */
export function volumeSettimanale(serie: Serie[]): { settimana: string; volume: number }[] {
  const m = new Map<string, number>()
  for (const s of serie) {
    if (s.caricoKg === null || s.ripetizioni === null) continue
    const k = lunediDi(s.data)
    m.set(k, (m.get(k) ?? 0) + s.caricoKg * s.ripetizioni)
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([settimana, volume]) => ({ settimana, volume }))
}

export function volumeSerie(serie: Serie[]): number {
  return serie.reduce((t, s) => t + (s.caricoKg ?? 0) * (s.ripetizioni ?? 0), 0)
}
