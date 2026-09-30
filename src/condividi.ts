/**
 * Consegna di un file generato dall'app: sul telefono il foglio di condivisione (salva in File,
 * AirDrop...), sul computer il download diretto. Chrome desktop supporta la condivisione, ma li'
 * ci si aspetta che il file venga scaricato.
 */
const suTelefono = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches

export async function consegnaFile(blob: Blob, nome: string, titolo: string) {
  const file = new File([blob], nome, { type: blob.type })
  if (suTelefono() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
