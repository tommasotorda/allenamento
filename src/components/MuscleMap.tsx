import { useId, useMemo } from 'react'
import { esercizio } from '../domain/data'
import { espandi } from '../domain/muscles'
import { mappaSvg, type VistaMappa } from '../figures/muscleMap'

/** Mappa muscolare dell'esercizio (fronte e retro), muscoli in scala di rossi. */
export function MuscleMap({ id, vista = 'entrambe', className = '' }: { id: string; vista?: VistaMappa; className?: string }) {
  const prefisso = 'mm' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const es = esercizio(id)
  const svg = useMemo(() => mappaSvg(espandi(es.muscoli), { vista, prefisso, titolo: `Muscoli: ${es.nome}` }), [es, vista, prefisso])
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
