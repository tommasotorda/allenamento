import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader } from '../../components/ui'
import { iniziaSeduta, sedutaAperta } from '../../db/repositories'
import { GIORNI, NOMI_GIORNI, programma } from '../../domain/data'
import { strutturaSeduta } from '../../domain/session'
import type { GiornoId } from '../../domain/types'
import { useCiclo } from '../../hooks'
import { SessionPreview } from './SessionPreview'

export function SedutaDettaglioPage() {
  const { giorno } = useParams()
  const c = useCiclo()
  const nav = useNavigate()
  if (!c || !GIORNI.includes(giorno as GiornoId)) return null
  const g = giorno as GiornoId
  const s = strutturaSeduta(programma, g, c.settimana, c.fase, c.impostazioni.sbloccati)

  return (
    <div>
      <PageHeader back="/scheda" title={s.nome} subtitle={`${NOMI_GIORNI[g]} · ${c.fase.nome}`} />
      <Button
        variant="primary"
        big
        className="mt-2 w-full"
        onClick={async () => {
          if (!(await sedutaAperta(c.oggi))) await iniziaSeduta(g, c.settimana, c.oggi)
          nav('/')
        }}
      >
        Avvia questa seduta
      </Button>
      <SessionPreview s={s} fase={c.fase} />
    </div>
  )
}
