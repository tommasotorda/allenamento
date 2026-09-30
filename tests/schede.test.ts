import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { assicuraPianoAttivo, eliminaTutteLeSchede, iniziaSeduta, salvaPiano, salvaProfilo } from '../src/db/repositories'
import { db } from '../src/db/schema'
import { pianoOriginale } from '../src/domain/plans'

describe('schede', () => {
  it('al primo avvio non crea nessuna scheda', async () => {
    expect(await assicuraPianoAttivo()).toBeUndefined()
    expect(await db.piani.count()).toBe(0)
  })

  it('elimina tutte le schede tenendo storico e profili', async () => {
    const p = pianoOriginale('2026-09-07')
    await salvaPiano(p, true)
    await salvaProfilo({ id: 'p1', nome: 'Mio', obiettivi: ['forza'], creato: '2026-09-30', programma: p.programma })
    const s = await iniziaSeduta(p, 'lun', 1, '2026-09-28')

    await eliminaTutteLeSchede()

    expect(await db.piani.count()).toBe(0)
    expect((await db.impostazioni.get('singleton'))?.pianoAttivo).toBeUndefined()
    expect(await db.profili.count()).toBe(1)
    expect((await db.sedute.get(s.id))?.fine).not.toBeNull()
    expect(await assicuraPianoAttivo()).toBeUndefined()
  })
})
