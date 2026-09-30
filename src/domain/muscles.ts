/** Gruppi muscolari della mappa anatomica (stile Technogym), con la vista in cui compaiono. */
export const MUSCOLI = {
  // vista anteriore
  'pettorale-alto': { nome: 'Pettorale alto', vista: 'fronte' },
  'pettorale-basso': { nome: 'Pettorale basso', vista: 'fronte' },
  'retto-addominale': { nome: 'Retto addominale', vista: 'fronte' },
  obliqui: { nome: 'Obliqui esterni', vista: 'fronte' },
  'deltoide-anteriore': { nome: 'Deltoide anteriore', vista: 'fronte' },
  bicipite: { nome: 'Bicipite', vista: 'fronte' },
  'avambraccio-flessori': { nome: 'Flessori avambraccio', vista: 'fronte' },
  'retto-femorale': { nome: 'Retto femorale', vista: 'fronte' },
  'vasto-laterale': { nome: 'Vasto laterale', vista: 'fronte' },
  'vasto-mediale': { nome: 'Vasto mediale', vista: 'fronte' },
  adduttori: { nome: 'Adduttori', vista: 'fronte' },
  'tibiale-anteriore': { nome: 'Tibiale anteriore', vista: 'fronte' },
  // vista posteriore
  'trapezio-alto': { nome: 'Trapezio alto', vista: 'retro' },
  'trapezio-medio': { nome: 'Trapezio medio', vista: 'retro' },
  'trapezio-basso': { nome: 'Trapezio basso', vista: 'retro' },
  'gran-dorsale': { nome: 'Gran dorsale', vista: 'retro' },
  'erettori-spinali': { nome: 'Erettori spinali', vista: 'retro' },
  lombari: { nome: 'Zona lombare', vista: 'retro' },
  'deltoide-posteriore': { nome: 'Deltoide posteriore', vista: 'retro' },
  tricipite: { nome: 'Tricipite', vista: 'retro' },
  'avambraccio-estensori': { nome: 'Estensori avambraccio', vista: 'retro' },
  'grande-gluteo': { nome: 'Grande gluteo', vista: 'retro' },
  'medio-gluteo': { nome: 'Medio gluteo', vista: 'retro' },
  'bicipite-femorale': { nome: 'Bicipite femorale', vista: 'retro' },
  semitendinoso: { nome: 'Semitendinoso', vista: 'retro' },
  'gastrocnemio-laterale': { nome: 'Gastrocnemio laterale', vista: 'retro' },
  'gastrocnemio-mediale': { nome: 'Gastrocnemio mediale', vista: 'retro' },
  soleo: { nome: 'Soleo', vista: 'retro' },
} as const

export type MuscoloId = keyof typeof MUSCOLI
export const MUSCOLI_ID = Object.keys(MUSCOLI) as MuscoloId[]

/** Scorciatoie usate in exercises.json per indicare piu' muscoli insieme. */
export const ALIAS: Record<string, MuscoloId[]> = {
  pettorali: ['pettorale-alto', 'pettorale-basso'],
  addome: ['retto-addominale'],
  quadricipiti: ['retto-femorale', 'vasto-laterale', 'vasto-mediale'],
  femorali: ['bicipite-femorale', 'semitendinoso'],
  glutei: ['grande-gluteo', 'medio-gluteo'],
  trapezio: ['trapezio-alto', 'trapezio-medio', 'trapezio-basso'],
  polpacci: ['gastrocnemio-laterale', 'gastrocnemio-mediale', 'soleo'],
  gastrocnemio: ['gastrocnemio-laterale', 'gastrocnemio-mediale'],
  avambracci: ['avambraccio-flessori', 'avambraccio-estensori'],
  spalle: ['deltoide-anteriore', 'deltoide-posteriore'],
}

/** 1 = stabilizzatore, 2 = secondario, 3 = primario. */
export type Livello = 1 | 2 | 3
export type Coinvolgimento = Partial<Record<MuscoloId, Livello>>

/** Espande gli alias; se un muscolo compare piu' volte vale il livello piu' alto. */
export function espandi(raw: Record<string, number> | undefined): Coinvolgimento {
  const out: Coinvolgimento = {}
  for (const [k, v] of Object.entries(raw ?? {})) {
    const ids = ALIAS[k] ?? (k in MUSCOLI ? [k as MuscoloId] : [])
    for (const id of ids) out[id] = Math.max(out[id] ?? 0, v) as Livello
  }
  return out
}

export function chiaviValide(raw: Record<string, number>): string[] {
  return Object.keys(raw).filter((k) => !(k in ALIAS) && !(k in MUSCOLI))
}

/** Somiglianza coseno tra due profili di coinvolgimento (0..1). */
export function somiglianza(a: Coinvolgimento, b: Coinvolgimento): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const id of MUSCOLI_ID) {
    const x = a[id] ?? 0
    const y = b[id] ?? 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export function perLivello(c: Coinvolgimento, l: Livello): MuscoloId[] {
  return MUSCOLI_ID.filter((id) => c[id] === l)
}
