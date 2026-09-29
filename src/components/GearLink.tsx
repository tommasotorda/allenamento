import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'

/** Icona ingranaggio per l'intestazione (su mobile le impostazioni non sono nella barra). */
export function GearLink() {
  return (
    <NavLink to="/impostazioni" className="flex size-11 items-center justify-center rounded-xl text-zinc-500 active:bg-zinc-200 md:hidden dark:active:bg-zinc-800" aria-label="Impostazioni">
      <Icon name="gear" />
    </NavLink>
  )
}
