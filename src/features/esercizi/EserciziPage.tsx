import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GearLink } from '../../components/GearLink'
import { Chip, ExerciseThumb, PageHeader } from '../../components/ui'
import { CATEGORIE, esercizi, NOMI_CATEGORIE } from '../../domain/data'
import type { Categoria } from '../../domain/types'

type Filtro = Categoria | 'funzionali'

export function EserciziPage() {
  const [cat, setCat] = useState<Filtro | null>(() => {
    try {
      return sessionStorage.getItem('esercizi.cat') as Filtro | null
    } catch {
      return null
    }
  })
  const scegli = (c: Filtro | null) => {
    setCat(c)
    try {
      if (c) sessionStorage.setItem('esercizi.cat', c)
      else sessionStorage.removeItem('esercizi.cat')
    } catch {
      /* storage non disponibile */
    }
  }
  const lista = esercizi.filter((e) => !cat || (cat === 'funzionali' ? e.funzionale : e.categoria === cat))

  return (
    <div>
      <PageHeader title="Esercizi" subtitle={`${lista.length} esercizi`} right={<GearLink />} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!cat} onClick={() => scegli(null)}>
          Tutti
        </Chip>
        <Chip active={cat === 'funzionali'} onClick={() => scegli('funzionali')}>
          Funzionali
        </Chip>
        {CATEGORIE.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => scegli(c)}>
            {NOMI_CATEGORIE[c]}
          </Chip>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {lista.map((e) => (
          <Link key={e.id} to={`/esercizi/${e.id}`} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
            <ExerciseThumb id={e.id} className="aspect-[240/196] w-full rounded-none" />
            <div className="p-2.5">
              <div className="text-sm font-semibold leading-tight">{e.nome}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{NOMI_CATEGORIE[e.categoria]}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
