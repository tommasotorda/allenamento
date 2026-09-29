// Controlla la coerenza dei dati statici: esce con codice 1 se trova errori.
import esercizi from '../src/data/exercises.json' with { type: 'json' }
import programma from '../src/data/program.json' with { type: 'json' }
import { validaDati } from '../src/domain/validate'
import { FIGURE } from '../src/figures/poses'

const errori = validaDati(esercizi as never, programma as never, Object.keys(FIGURE))
if (errori.length) {
  console.error(`✗ ${errori.length} errori:\n` + errori.map((e) => '  - ' + e).join('\n'))
  process.exit(1)
}
console.log(`✓ dati validi: ${esercizi.length} esercizi, tutti con descrizione e figura`)
