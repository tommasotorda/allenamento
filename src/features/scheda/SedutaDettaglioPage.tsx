import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../components/ui'
import { iniziaSeduta, sedutaAperta } from '../../db/repositories'
import { NOMI_GIORNI } from '../../domain/data'
import { strutturaSeduta } from '../../domain/session'
import { useCiclo } from '../../hooks'
import { BlockEditor } from './BlockEditor'
import { SessionPreview } from './SessionPreview'

export function SedutaDettaglioPage() {
  const { giorno } = useParams()
  const [params, setParams] = useSearchParams()
  const modifica = params.get('modifica') === '1'
  const c = useCiclo()
  const nav = useNavigate()
  if (!c || !giorno || !c.programma.sedute[giorno]) return null
  const g = giorno
  const s = strutturaSeduta(c.programma, g, c.settimana, c.fase, c.impostazioni.sbloccati)
  const sed = c.programma.sedute[g]
  const giorni = c.programma.settimana.filter((x) => x.sedutaId === g).map((x) => NOMI_GIORNI[x.giorno])

  return (
    <div>
      <PageHeader
        back="/scheda"
        title={s.nome}
        subtitle={[giorni.join(', '), c.fase.nome].filter(Boolean).join(' · ')}
        right={
          <Button variant={modifica ? 'primary' : 'secondary'} onClick={() => setParams(modifica ? {} : { modifica: '1' }, { replace: true })}>
            {modifica ? 'Fine' : 'Modifica'}
          </Button>
        }
      />

      {modifica ? (
        <>
          {sed.core && (
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
          {(sed.palestra || !sed.mobilita) && <BlockEditor titolo="Palestra" blocco={{ tipo: 'palestra', sedutaId: g }} c={c} />}
          {sed.mobilita && <BlockEditor titolo="Mobilità" blocco={{ tipo: 'mobilita', sedutaId: g }} c={c} />}
        </>
      ) : (
        <>
          <Button
            variant="primary"
            big
            className="mt-2 w-full"
            onClick={async () => {
              if (!(await sedutaAperta(c.oggi))) await iniziaSeduta(c.piano, g, c.settimana, c.oggi)
              nav('/')
            }}
          >
            Avvia questa seduta
          </Button>
          <SessionPreview s={s} fase={c.fase} programma={c.programma} pianoId={c.piano.id} />
        </>
      )}
    </div>
  )
}
