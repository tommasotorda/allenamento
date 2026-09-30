import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { PageHeader } from '../../components/ui'
import { GearLink } from '../../components/GearLink'

/** I quattro modi per creare una scheda. */
export function ModiNuovaScheda() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Link to="/questionario" className="flex h-24 flex-col justify-center rounded-2xl bg-accent px-3 font-semibold leading-tight text-white">
        <Icon name="plus" className="mb-1 size-6" />
        Questionario
      </Link>
      <Link to="/profili" className="flex h-24 flex-col justify-center rounded-2xl bg-zinc-900 px-3 font-semibold leading-tight text-white dark:bg-white dark:text-zinc-900">
        <Icon name="book" className="mb-1 size-6" />
        Da un profilo
      </Link>
      <Link to="/scheda-libera" className="flex h-24 flex-col justify-center rounded-2xl bg-white px-3 font-semibold leading-tight ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10">
        <Icon name="swap" className="mb-1 size-6 text-accent" />
        Scheda libera
      </Link>
      <Link to="/scheda-ai" className="flex h-24 flex-col justify-center rounded-2xl bg-white px-3 font-semibold leading-tight ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10">
        <Icon name="spark" className="mb-1 size-6 text-accent" />
        Da un'AI
      </Link>
    </div>
  )
}

/** Primo avvio: nessuna scheda, si sceglie come crearne una. */
export function InvitoScheda({ titolo }: { titolo: string }) {
  return (
    <div>
      <PageHeader title={titolo} right={<GearLink />} />
      <div className="mb-4 mt-6 px-1">
        <div className="text-xl font-bold">Crea la tua scheda</div>
        <div className="mt-1 text-sm text-zinc-500">Non hai ancora nessuna scheda. Scegli come crearla.</div>
      </div>
      <ModiNuovaScheda />
      <Link to="/impostazioni" className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-zinc-500 ring-1 ring-zinc-900/10 dark:ring-white/10">
        <span>Hai un backup? Importalo dalle impostazioni</span>
        <Icon name="chevron" className="size-5 shrink-0 text-zinc-400" />
      </Link>
    </div>
  )
}
