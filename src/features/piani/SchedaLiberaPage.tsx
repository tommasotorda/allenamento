import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Chip, PageHeader, SectionTitle } from '../../components/ui'
import { salvaPiano } from '../../db/repositories'
import { lunediDi } from '../../domain/calendar'
import { GIORNI, NOMI_GIORNI } from '../../domain/data'
import { NOMI_OBIETTIVI } from '../../domain/generator'
import { pianoLibero } from '../../domain/plans'
import type { GiornoId, Obiettivo } from '../../domain/types'
import { useOggi } from '../../hooks'

const PROGRESSIONI: Obiettivo[] = ['forza', 'massa', 'potenza', 'resistenza', 'stabilita']

/** Scheda libera: si parte da sedute vuote e si scelgono gli esercizi uno per uno. */
export function SchedaLiberaPage() {
  const oggi = useOggi()
  const nav = useNavigate()
  const [nome, setNome] = useState('La mia scheda')
  const [giorni, setGiorni] = useState<GiornoId[]>(['lun', 'mer', 'ven'])
  const [progressione, setProgressione] = useState<Obiettivo>('forza')

  const crea = async () => {
    const p = pianoLibero({ nome: nome.trim() || 'La mia scheda', giorni, progressione, inizio: lunediDi(oggi) })
    await salvaPiano(p, true)
    nav('/scheda/s1?modifica=1', { replace: true })
  }

  return (
    <div>
      <PageHeader back="/schede" title="Scheda libera" />
      <label className="block">
        <span className="px-1 text-sm font-semibold text-zinc-500">Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-white px-3 font-semibold ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10" />
      </label>

      <SectionTitle>Giorni</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {GIORNI.map((g) => (
          <Chip key={g} active={giorni.includes(g)} onClick={() => setGiorni(GIORNI.filter((x) => (x === g ? !giorni.includes(g) : giorni.includes(x))))}>
            {NOMI_GIORNI[g].slice(0, 3)}
          </Chip>
        ))}
      </div>

      <SectionTitle>Progressione del ciclo</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {PROGRESSIONI.map((o) => (
          <Chip key={o} active={progressione === o} onClick={() => setProgressione(o)}>
            {NOMI_OBIETTIVI[o]}
          </Chip>
        ))}
      </div>

      <Card className="mt-6 text-sm text-zinc-500">
        {giorni.length} {giorni.length === 1 ? 'seduta vuota' : 'sedute vuote'}: {giorni.map((g, i) => `${NOMI_GIORNI[g]} · Seduta ${String.fromCharCode(65 + i)}`).join(', ')}
      </Card>

      <Button variant="primary" big className="mt-6 w-full" disabled={!giorni.length} onClick={crea}>
        Crea e scegli gli esercizi
      </Button>
    </div>
  )
}
