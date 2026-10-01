import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Card, Chip, ExerciseThumb } from '../../components/ui'
import { CATEGORIE, esercizi, esercizio, NOMI_CATEGORIE } from '../../domain/data'
import { prescrizioneDefault, suggerisciSostituti } from '../../domain/editing'
import { AnteprimaEsercizio } from '../esercizi/AnteprimaEsercizio'
import { MUSCOLI } from '../../domain/muscles'
import type { Categoria, Esercizio, Prescrizione } from '../../domain/types'
import { PrescrizioneForm } from './PrescrizioneForm'
import { indiceVoce, VoceInSeduta, type SedutaInModifica } from './VoceInSeduta'

interface Props {
  titolo: string
  /** esercizio da sostituire: mostra i suggerimenti affini */
  sostituisci?: string
  /** gia' presenti nel blocco */
  esclusi: string[]
  onScegli: (es: Esercizio) => void
  onChiudi: () => void
  /**
   * Blocco a cui si aggiunge: dall'anteprima si aggiunge con le specifiche scelte restando
   * nell'anteprima, e le voci gia' presenti si modificano, spostano e collegano in superserie.
   */
  seduta?: SedutaInModifica
}

/**
 * Selettore a schermo intero: suggerimenti per muscoli coinvolti e libreria filtrabile.
 * Il tasto a destra sceglie subito; toccando la riga si apre l'anteprima (3D, muscoli, esecuzione)
 * sopra il selettore, che resta com'era quando la si chiude.
 */
export function ExercisePicker({ titolo, sostituisci, esclusi, onScegli, onChiudi, seduta }: Props) {
  const [cat, setCat] = useState<Categoria | null>(sostituisci ? esercizio(sostituisci).categoria : null)
  const suggeriti = sostituisci ? suggerisciSostituti(sostituisci, esclusi) : []
  const lista = esercizi.filter((e) => e.categoria !== 'pista' && (!cat || e.categoria === cat) && e.id !== sostituisci)
  // ordine di scorrimento nell'anteprima: suggeriti, poi la libreria filtrata
  const ordine = [...new Set([...suggeriti.map((x) => x.es.id), ...lista.map((e) => e.id)])]
  const [anteprima, setAnteprima] = useState<number | null>(null)
  // specifiche dell'esercizio che si sta aggiungendo dall'anteprima, finche' non si conferma
  const [bozza, setBozza] = useState<Prescrizione | null>(null)
  const apriAnteprima = (p: number | null) => {
    setBozza(null)
    setAnteprima(p)
  }

  // blocca lo scorrimento della pagina sotto
  useEffect(() => {
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prima
    }
  }, [])

  const riga = (e: Esercizio, extra?: React.ReactNode) => {
    const presente = esclusi.includes(e.id)
    return (
      <div key={e.id} className="flex items-center gap-1">
        <button type="button" onClick={() => apriAnteprima(ordine.indexOf(e.id))} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-zinc-100 dark:active:bg-zinc-800" aria-label={`Anteprima di ${e.nome}`}>
          <ExerciseThumb id={e.id} className={`size-14 ${presente ? 'opacity-40' : ''}`} />
          <div className={`min-w-0 flex-1 ${presente ? 'opacity-40' : ''}`}>
            <div className="font-semibold">{e.nome}</div>
            <div className="text-xs text-zinc-500">{NOMI_CATEGORIE[e.categoria]}</div>
            {extra}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onScegli(e)}
          disabled={presente}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent active:bg-accent/20 disabled:opacity-30"
          aria-label={`${sostituisci ? 'Sostituisci con' : 'Aggiungi'} ${e.nome}`}
        >
          <Icon name={sostituisci ? 'swap' : 'plus'} className="size-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="pt-safe fixed inset-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950" role="dialog" aria-modal="true" aria-label={titolo}>
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 pb-2 pt-3">
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{titolo}</h2>
        <button type="button" onClick={onChiudi} className="flex size-11 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800" aria-label="Chiudi">
          <Icon name="close" className="size-5" />
        </button>
      </div>
      <div className="pb-safe mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8">
        {suggeriti.length > 0 && (
          <>
            <div className="mb-1 mt-2 px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Affini per muscoli coinvolti</div>
            <div className="rounded-2xl bg-white p-1 ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
              {suggeriti.map((s) =>
                riga(
                  s.es,
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent-strong dark:text-accent">{Math.round(s.punteggio * 100)}%</span>
                    {s.comuni.slice(0, 3).map((m) => (
                      <span key={m} className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        {MUSCOLI[m].nome}
                      </span>
                    ))}
                  </div>,
                ),
              )}
            </div>
          </>
        )}
        <div className="mb-1 mt-5 px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Libreria</div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Chip active={!cat} onClick={() => setCat(null)}>
            Tutti
          </Chip>
          {CATEGORIE.filter((c) => c !== 'pista').map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {NOMI_CATEGORIE[c]}
            </Chip>
          ))}
        </div>
        <div className="rounded-2xl bg-white p-1 ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">{lista.map((e) => riga(e))}</div>
      </div>
      {anteprima !== null && ordine[anteprima] && (
        <AnteprimaEsercizio
          ids={ordine}
          pos={anteprima}
          onPos={apriAnteprima}
          onChiudi={() => apriAnteprima(null)}
          pannello={(es) =>
            bozza?.esercizioId === es.id ? (
              <Card className="mt-3 p-3 ring-2 ring-accent">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Da aggiungere</div>
                <PrescrizioneForm p={bozza} onChange={setBozza} />
              </Card>
            ) : seduta ? (
              <VoceInSeduta id={es.id} seduta={seduta} />
            ) : null
          }
          piede={(es) => {
            if (bozza?.esercizioId === es.id && seduta)
              return (
                <div className="flex gap-2">
                  <Button big className="flex-1" onClick={() => setBozza(null)}>
                    Annulla
                  </Button>
                  <Button
                    variant="primary"
                    big
                    className="flex-[2]"
                    onClick={async () => {
                      await seduta.salva([...seduta.voci, bozza])
                      setBozza(null)
                    }}
                  >
                    <Icon name="check" className="size-5" /> Conferma
                  </Button>
                </div>
              )
            if (esclusi.includes(es.id) || (seduta && indiceVoce(seduta.voci, es.id) >= 0)) return null
            return (
              <Button variant="primary" big className="w-full" onClick={() => (seduta && !sostituisci ? setBozza(prescrizioneDefault(es)) : onScegli(es))}>
                <Icon name={sostituisci ? 'swap' : 'plus'} className="size-5" /> {sostituisci ? 'Sostituisci con questo' : 'Aggiungi alla scheda'}
              </Button>
            )
          }}
        />
      )}
    </div>
  )
}
