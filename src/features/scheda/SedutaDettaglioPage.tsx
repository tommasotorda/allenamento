import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../components/ui'
import { iniziaSeduta, sedutaAperta } from '../../db/repositories'
import { haBloccoCore } from '../../domain/calendar'
import { GIORNI, NOMI_GIORNI } from '../../domain/data'
import { strutturaSeduta } from '../../domain/session'
import type { GiornoId } from '../../domain/types'
import { useCiclo } from '../../hooks'
import { BlockEditor } from './BlockEditor'
import { SessionPreview } from './SessionPreview'

export function SedutaDettaglioPage() {
  const { giorno } = useParams()
  const [params, setParams] = useSearchParams()
  const modifica = params.get('modifica') === '1'
  const c = useCiclo()
  const nav = useNavigate()
  if (!c || !GIORNI.includes(giorno as GiornoId)) return null
  const g = giorno as GiornoId
  const s = strutturaSeduta(c.programma, g, c.settimana, c.fase, c.impostazioni.sbloccati)
  const sed = c.programma.sedute[g]

  return (
    <div>
      <PageHeader
        back="/scheda"
        title={s.nome}
        subtitle={`${NOMI_GIORNI[g]} · ${c.fase.nome}`}
        right={
          <Button variant={modifica ? 'primary' : 'secondary'} onClick={() => setParams(modifica ? {} : { modifica: '1' }, { replace: true })}>
            {modifica ? 'Fine' : 'Modifica'}
          </Button>
        }
      />

      {modifica ? (
        <>
          {haBloccoCore(g) && (
            <>
              <BlockEditor titolo="Core · variante A" blocco={{ tipo: 'core', variante: 'A' }} c={c} />
              <BlockEditor titolo="Core · variante B" blocco={{ tipo: 'core', variante: 'B' }} c={c} />
            </>
          )}
          {s.pista && (
            <Card className="mt-6 text-sm text-zinc-500">
              <b className="text-zinc-900 dark:text-zinc-100">Pista:</b> {s.pista.testo}
            </Card>
          )}
          {(sed.palestra || !sed.mobilita) && <BlockEditor titolo="Palestra" blocco={{ tipo: 'palestra', giorno: g }} c={c} />}
          {sed.mobilita && <BlockEditor titolo="Mobilità" blocco={{ tipo: 'mobilita', giorno: g }} c={c} />}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
