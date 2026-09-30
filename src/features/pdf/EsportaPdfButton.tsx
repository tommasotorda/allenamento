import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui'
import type { Piano } from '../../domain/types'

const nomeFile = (nome: string) =>
  `scheda-${nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)}.pdf`

/** Crea il PDF navigabile della scheda e lo condivide (iPhone) o lo scarica (Mac). */
export function EsportaPdfButton({ piano, settimana, sbloccati, className = '' }: { piano: Piano; settimana: number; sbloccati: string[]; className?: string }) {
  const [progresso, setProgresso] = useState<number | null>(null)
  const [errore, setErrore] = useState(false)

  const esporta = async () => {
    setErrore(false)
    setProgresso(0)
    try {
      // jsPDF e svg2pdf si caricano solo quando servono
      const { esportaPdf } = await import('./esportaPdf')
      const blob = await esportaPdf(piano, { settimana, sbloccati, onProgresso: setProgresso })
      const nome = nomeFile(piano.nome)
      const file = new File([blob], nome, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: piano.nome })
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
        }
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = nome
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
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
      {progresso !== null ? `Creo il PDF… ${Math.round(progresso * 100)}%` : errore ? 'Riprova PDF' : 'Esporta PDF'}
    </Button>
  )
}
