import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui'
import type { Piano } from '../../domain/types'
import { consegnaPdf, nomeFilePdf } from './comune'

/** Pulsante che crea un PDF (caricando le librerie solo al clic) e lo condivide o scarica. */
export function PdfButton({
  crea,
  etichetta = 'Esporta PDF',
  className = '',
}: {
  crea: (onProgresso: (x: number) => void) => Promise<{ blob: Blob; nome: string; titolo: string }>
  etichetta?: string
  className?: string
}) {
  const [progresso, setProgresso] = useState<number | null>(null)
  const [errore, setErrore] = useState(false)

  const esporta = async () => {
    setErrore(false)
    setProgresso(0)
    try {
      const { blob, nome, titolo } = await crea(setProgresso)
      await consegnaPdf(blob, nome, titolo)
    } catch (e) {
      console.error(e)
      setErrore(true)
    } finally {
      setProgresso(null)
    }
  }

  return (
    <Button className={className} onClick={esporta} disabled={progresso !== null}>
      <Icon name="download" className="size-5" />
      {progresso !== null ? `Creo il PDF… ${Math.round(progresso * 100)}%` : errore ? 'Riprova PDF' : etichetta}
    </Button>
  )
}

/** PDF navigabile della scheda. */
export function EsportaPdfButton({ piano, settimana, sbloccati, className = '' }: { piano: Piano; settimana: number; sbloccati: string[]; className?: string }) {
  return (
    <PdfButton
      className={className}
      crea={async (onProgresso) => {
        // jsPDF e svg2pdf si caricano solo quando servono
        const { esportaPdf } = await import('./esportaPdf')
        const blob = await esportaPdf(piano, { settimana, sbloccati, onProgresso })
        return { blob, nome: nomeFilePdf('scheda', piano.nome), titolo: piano.nome }
      }}
    />
  )
}
