import { useEffect, useState } from 'react'
import { Icon } from './Icon'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  step: number
  min?: number
  max?: number
  /** Valore da cui partire quando il campo e' vuoto e si preme + o -. */
  start?: number
  label?: string
  unit?: string
  decimals?: number
  disabled?: boolean
  size?: 'md' | 'lg'
}

const fmt = (v: number, d: number) => (d > 0 ? v.toFixed(d).replace(/\.?0+$/, '').replace('.', ',') : String(Math.round(v)))

/** Campo numerico con pulsanti grandi; il valore centrale e' comunque modificabile a mano. */
export function Stepper({ value, onChange, step, min = 0, max = 9999, start, label, unit, decimals = 0, disabled, size = 'md' }: Props) {
  const [testo, setTesto] = useState(value === null ? '' : fmt(value, decimals))
  useEffect(() => setTesto(value === null ? '' : fmt(value, decimals)), [value, decimals])

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const muovi = (dir: 1 | -1) => {
    if (value === null) onChange(clamp(start ?? min))
    else onChange(clamp(value + dir * step))
  }
  const btn =
    size === 'lg'
      ? 'size-14 rounded-2xl'
      : 'size-11 rounded-xl'

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>}
      <div className="flex items-center gap-1">
        <button type="button" disabled={disabled} onClick={() => muovi(-1)} className={`${btn} flex items-center justify-center bg-zinc-200 active:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:active:bg-zinc-700`} aria-label={`meno ${label ?? ''}`}>
          <Icon name="minus" className="size-5" />
        </button>
        <label className="relative">
          <input
            inputMode="decimal"
            disabled={disabled}
            value={testo}
            placeholder="–"
            onChange={(e) => setTesto(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => {
              const n = Number(testo.replace(',', '.'))
              if (testo.trim() === '') onChange(null)
              else if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
              else setTesto(value === null ? '' : fmt(value, decimals))
            }}
            className={`${size === 'lg' ? 'h-14 w-20 text-2xl' : 'h-11 w-14 text-lg'} rounded-xl bg-transparent text-center font-semibold tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-accent dark:focus:bg-zinc-900`}
          />
          {unit && <span className="pointer-events-none absolute -bottom-1 left-0 right-0 text-center text-[10px] text-zinc-500">{unit}</span>}
        </label>
        <button type="button" disabled={disabled} onClick={() => muovi(1)} className={`${btn} flex items-center justify-center bg-zinc-200 active:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:active:bg-zinc-700`} aria-label={`più ${label ?? ''}`}>
          <Icon name="plus" className="size-5" />
        </button>
      </div>
    </div>
  )
}
