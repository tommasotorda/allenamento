// Stampa le schede generate dai profili standard (controllo a colpo d'occhio).
import { esercizio } from '../src/domain/data'
import { generaProgramma } from '../src/domain/generator'
import { PROFILI } from '../src/domain/profili'
import { testoPrescrizione } from '../src/domain/progression'
import { isCircuito } from '../src/domain/types'

for (const pr of PROFILI.filter((p) => !process.argv[2] || process.argv[2].split(',').includes(p.id))) {
  const p = generaProgramma(pr.risposte)
  console.log(`\n===== ${pr.nome}  (fasi: ${p.fasi.map((f) => f.nome).join(', ')})`)
  console.log('  core A:', p.blocco_core.varianteA.map((x) => esercizio(x.esercizioId).nome).join(', '))
  console.log('  core B:', p.blocco_core.varianteB.map((x) => esercizio(x.esercizioId).nome).join(', '))
  for (const { giorno, sedutaId } of p.settimana) {
    const s = p.sedute[sedutaId]
    console.log(`  ${giorno} ${s.nome}${s.core ? ' [core]' : ''}${s.pista ? ' [pista: ' + esercizio(s.pista.esercizioId).nome + ']' : ''}`)
    for (const v of s.palestra ?? []) {
      if (isCircuito(v)) console.log(`     - circuito ${v.giri}x: ${v.esercizi.map((id) => esercizio(id).nome).join(', ')}`)
      else console.log(`     - ${esercizio(v.esercizioId).nome}: ${testoPrescrizione(v, p.fasi[0], esercizio(v.esercizioId))}`)
    }
    console.log(`     ~ ${(s.mobilita ?? []).map((x) => esercizio(x.esercizioId).nome).join(', ')}`)
  }
}
