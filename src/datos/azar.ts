// Seeded randomness: the same seed always gives the same order, so a child's order survives
// reloads and can be reproduced when reading their data.
export function azar(semilla: string) {
  let h = 1779033703 ^ semilla.length;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let s = h >>> 0;
  const siguiente = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    frac: siguiente,
    barajar<T>(lista: T[]): T[] {
      const r = [...lista];
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(siguiente() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    },
  };
}
