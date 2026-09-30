/** randomUUID esiste solo in contesti sicuri (HTTPS o localhost): in anteprima via Wi-Fi si usa getRandomValues. */
export const uuid = (): string =>
  crypto.randomUUID?.() ??
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16))

export const clona = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
