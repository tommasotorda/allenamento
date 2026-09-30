import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Stepper } from '../../components/Stepper'
import type { Serie, TipoRegistrazione } from '../../domain/types'

export type { Bozza } from '../../domain/progression'
import type { Bozza } from '../../domain/progression'

interface Props {
  etichetta: string
  tipo: TipoRegistrazione
  iniziale: Bozza
  salvata?: Serie
  incrementoKg: number
  conRpe: boolean
  onConferma: (b: Bozza) => void
  onElimina?: () => void
  /** valori attuali della riga (anche se non ancora confermata) */
  onBozza?: (b: Bozza) => void
}

/** Riga di una serie: precompilata, si conferma con un tap. */
export function SetRow({ etichetta, tipo, iniziale, salvata, incrementoKg, conRpe, onConferma, onElimina, onBozza }: Props) {
  const [b, setB] = useState<Bozza>(salvata ?? iniziale)
  useEffect(() => {
    onBozza?.(b)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(b)])
  const [modifica, setModifica] = useState(!salvata)

  // se la serie viene salvata o cambia da fuori, riallinea la bozza
  useEffect(() => {
    if (salvata) {
      setB(salvata)
      setModifica(false)
    }
  }, [salvata])
  // aggiorna i valori proposti finche' l'utente non ha salvato
  useEffect(() => {
    if (!salvata) setB(iniziale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(iniziale)])

  const set = <K extends keyof Bozza>(k: K) => (v: Bozza[K]) => setB((x) => ({ ...x, [k]: v }))

  if (salvata && !modifica) {
    return (
      <button type="button" onClick={() => setModifica(true)} className="flex w-full items-center gap-3 rounded-xl bg-green-600/10 px-3 py-2.5 text-left">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <Icon name="check" className="size-4" />
        </span>
        <span className="w-10 shrink-0 text-sm font-semibold text-zinc-500">{etichetta}</span>
        <span className="flex-1 font-semibold tabular-nums">{riassunto(tipo, salvata)}</span>
      </button>
    )
  }

  const campi: React.ReactNode[] = []
  if (tipo === 'carico_ripetizioni' || tipo === 'distanza') {
    campi.push(<Stepper key="kg" label="kg" value={b.caricoKg} onChange={set('caricoKg')} step={incrementoKg} decimals={2} start={20} />)
  }
  if (tipo === 'carico_ripetizioni' || tipo === 'ripetizioni') {
    campi.push(<Stepper key="rip" label="rip" value={b.ripetizioni} onChange={set('ripetizioni')} step={1} start={8} />)
  }
  if (tipo === 'tempo') {
    campi.push(<Stepper key="sec" label="sec" value={b.durataSec} onChange={set('durataSec')} step={5} start={30} />)
  }
  if (tipo === 'distanza') {
    campi.push(<Stepper key="m" label="metri" value={b.distanzaM} onChange={set('distanzaM')} step={5} start={20} />)
  }
  if (conRpe) {
    campi.push(<Stepper key="rpe" label="RPE" value={b.rpe} onChange={set('rpe')} step={0.5} min={6} max={10} start={7} decimals={1} />)
  }

  return (
    <div className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800/60">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-zinc-500">{etichetta}</span>
        {salvata && onElimina && (
          <button type="button" onClick={onElimina} className="flex size-8 items-center justify-center rounded-lg text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-700" aria-label="Elimina serie">
            <Icon name="trash" className="size-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 justify-items-center gap-x-1 gap-y-2 sm:flex sm:flex-wrap sm:items-end sm:justify-around">
        {campi}
        <button
          type="button"
          onClick={() => {
            onConferma(b)
            setModifica(false)
          }}
          className={`${campi.length % 2 ? "self-end" : "col-span-2"} flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-accent font-semibold text-white active:bg-accent-strong sm:w-auto sm:min-w-24 sm:px-5`}
          aria-label="Conferma serie"
        >
          <Icon name="check" className="size-6" />
        </button>
      </div>
    </div>
  )
}

export function riassunto(tipo: TipoRegistrazione, s: Bozza): string {
  const p: string[] = []
  const kg = s.caricoKg !== null ? `${String(s.caricoKg).replace('.', ',')} kg` : null
  if (tipo === 'carico_ripetizioni') p.push([kg, s.ripetizioni !== null ? `${s.ripetizioni} rip` : s.durataSec !== null ? `${s.durataSec} s` : null].filter(Boolean).join(' × '))
  if (tipo === 'ripetizioni' && s.ripetizioni !== null) p.push(`${s.ripetizioni} rip`)
  if (tipo === 'tempo' && s.durataSec !== null) p.push(`${s.durataSec} s`)
  if (tipo === 'distanza') p.push([s.distanzaM !== null ? `${s.distanzaM} m` : null, kg].filter(Boolean).join(' · '))
  if (s.rpe !== null) p.push(`RPE ${String(s.rpe).replace('.', ',')}`)
  return p.filter(Boolean).join(' · ') || '—'
}
