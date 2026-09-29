import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, formatData, numIt } from '../../components/ui'

// Due colori di serie: arancio (principale) e ardesia (secondaria), distinti anche in luminosita'.
export const C1 = '#ea580c'
export const C2 = '#64748b'

const asse = { stroke: 'currentColor', strokeOpacity: 0.35, tick: { fontSize: 11, fill: 'currentColor', fillOpacity: 0.6 }, tickLine: false }

export function ChartCard({ titolo, children, vuoto }: { titolo: string; children: ReactNode; vuoto?: boolean }) {
  return (
    <Card className="mt-3 p-3">
      <div className="mb-2 px-1 font-semibold">{titolo}</div>
      {vuoto ? <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Nessun dato</div> : <div className="h-52 text-zinc-600 dark:text-zinc-400">{children}</div>}
    </Card>
  )
}

function TooltipBox({ active, payload, label, unita }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unita: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-900/10 dark:bg-zinc-800 dark:ring-white/10">
      <div className="mb-1 text-xs text-zinc-500">{label ? formatData(label) : ''}</div>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            {p.name}: <b className="tabular-nums">{numIt(p.value)} {unita}</b>
          </div>
        ))}
    </div>
  )
}

const tickData = (d: string) => formatData(d, { day: 'numeric', month: 'numeric' })

export interface Serie {
  key: string
  nome: string
  colore: string
  tipo: 'linea' | 'punti'
}

/** Grafico nel tempo con una sola scala y. */
export function LineaTempo({ dati, serie, unita }: { dati: Record<string, unknown>[]; serie: Serie[]; unita: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dati} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
        <XAxis dataKey="data" tickFormatter={tickData} {...asse} minTickGap={24} />
        <YAxis domain={['auto', 'auto']} {...asse} width={44} tickFormatter={(v: number) => numIt(v, 1)} />
        <Tooltip content={<TooltipBox unita={unita} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.3 }} />
        {serie.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {serie.map((s) =>
          s.tipo === 'punti' ? (
            <Scatter key={s.key} dataKey={s.key} name={s.nome} fill={s.colore} fillOpacity={0.55} shape={(p: { cx?: number; cy?: number }) => <circle cx={p.cx} cy={p.cy} r={4} fill={s.colore} fillOpacity={0.55} />} />
          ) : (
            <Line key={s.key} dataKey={s.key} name={s.nome} stroke={s.colore} strokeWidth={2} dot={dati.length < 20 ? { r: 3.5, strokeWidth: 0, fill: s.colore } : false} activeDot={{ r: 5 }} connectNulls type="monotone" isAnimationActive={false} />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function Barre({ dati, xKey, yKey, nome, unita }: { dati: Record<string, unknown>[]; xKey: string; yKey: string; nome: string; unita: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dati} margin={{ top: 4, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
        <XAxis dataKey={xKey} tickFormatter={tickData} {...asse} minTickGap={16} />
        <YAxis {...asse} width={52} tickFormatter={(v: number) => numIt(v, 0)} />
        <Tooltip content={<TooltipBox unita={unita} />} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
        <Bar dataKey={yKey} name={nome} fill={C1} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
