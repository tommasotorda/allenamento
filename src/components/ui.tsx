import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useFotoUrl } from '../hooks'
import { ExerciseFigure } from './ExerciseFigure'
import { Icon } from './Icon'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10 ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{children}</h2>
      {right}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; big?: boolean }

export function Button({ variant = 'secondary', big, className = '', ...rest }: BtnProps) {
  const v = {
    primary: 'bg-accent text-white active:bg-accent-strong',
    secondary: 'bg-zinc-200 text-zinc-900 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700',
    danger: 'bg-red-600 text-white active:bg-red-700',
    ghost: 'text-accent active:bg-accent/10',
  }[variant]
  return <button type="button" className={`${big ? 'h-14 px-6 text-lg' : 'h-11 px-4'} inline-flex items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-40 ${v} ${className}`} {...rest} />
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: 'zinc' | 'accent' | 'green' | 'blue' }) {
  const t = {
    zinc: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    accent: 'bg-accent/15 text-accent-strong dark:text-accent',
    green: 'bg-green-600/15 text-green-700 dark:text-green-400',
    blue: 'bg-sky-600/15 text-sky-700 dark:text-sky-400',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t}`}>{children}</span>
}

/** Miniatura: la foto dell'utente ha priorita' sull'illustrazione. */
export function ExerciseThumb({ id, className = 'size-16' }: { id: string; className?: string }) {
  const foto = useFotoUrl(id)
  return (
    <div className={`shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 ${className}`}>
      {foto ? <img src={foto} alt="" className="size-full object-cover" /> : <ExerciseFigure id={id} className="size-full p-0.5" />}
    </div>
  )
}

export function PageHeader({ title, subtitle, back, right }: { title: ReactNode; subtitle?: ReactNode; back?: string; right?: ReactNode }) {
  return (
    <header className="mb-2 flex items-center gap-2 pt-2">
      {back && (
        <Link to={back} className="-ml-2 flex size-11 items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800" aria-label="Indietro">
          <Icon name="back" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        {subtitle && <div className="text-sm text-zinc-500">{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${value === o.id ? 'bg-white shadow-sm dark:bg-zinc-950' : 'text-zinc-600 dark:text-zinc-400'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
    >
      {children}
    </button>
  )
}

export function formatData(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', opts)
}

export function numIt(n: number, dec = 1) {
  return n.toLocaleString('it-IT', { maximumFractionDigits: dec })
}
