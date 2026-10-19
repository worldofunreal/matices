// Which story comes next, where and when (GDD §4, §9).
// Each day's stories go by time of day (morning, afternoon, night). Within a time of day they go by
// route: in the morning the house ones first (the day starts at home), in the afternoon the house
// ones last (the afternoon ends at home). Stories in the same place are shuffled per child with the
// saved seed. A day opens and closes with a low-intensity story when there is one to swap in.
import Phaser from "phaser";
import contenido, { type Cuento } from "virtual:contenido";
import { estado, cambiarEstado, type Hora } from "./guardado";
import { semilla } from "./eventos";

const HORAS: Hora[] = ["manana", "tarde", "noche"];
const PAUSA_TRAS_MEDIO = 60_000; // at least a minute of free exploration after a medium story
const PAUSA_ENTRE = 10_000; // and a breath after any story, so two never chain back to back

export const cuento = (id: string) => contenido.cuentos.find((c) => c.id === id)!;
export const sitio = (id: string) => contenido.sitios[id];

function orden(dia: number): string[] {
  const guardado = estado().cuentos.orden[dia];
  if (guardado) return guardado;
  const rng = new Phaser.Math.RandomDataGenerator([`${semilla()}-dia-${dia}`]);
  const delDia = contenido.cuentos.filter((c) => c.dia === dia);
  const ids: string[] = [];
  for (const hora of HORAS) {
    const deHora = delDia.filter((c) => c.hora === hora);
    const enCasa = deHora.filter((c) => sitio(c.id).mapa === "casa");
    const fuera = deHora.filter((c) => sitio(c.id).mapa !== "casa");
    const porLugar = (lista: Cuento[]) => {
      const mapas = [...new Set(lista.map((c) => sitio(c.id).mapa))];
      return mapas.flatMap((m) => rng.shuffle(lista.filter((c) => sitio(c.id).mapa === m)));
    };
    const grupo = hora === "manana" ? [...porLugar(enCasa), ...porLugar(fuera)] : [...porLugar(fuera), ...porLugar(enCasa)];
    ids.push(...grupo.map((c) => c.id));
  }
  // Open and close with a low-intensity story, swapping within the same time of day and place.
  const bajar = (i: number) => {
    const c = cuento(ids[i]);
    if (c.intensidad === "baja") return;
    const j = ids.findIndex((id) => cuento(id).intensidad === "baja" && cuento(id).hora === c.hora && sitio(id).mapa === sitio(c.id).mapa);
    if (j >= 0) [ids[i], ids[j]] = [ids[j], ids[i]];
  };
  if (ids.length) {
    bajar(0);
    bajar(ids.length - 1);
  }
  cambiarEstado({ cuentos: { ...estado().cuentos, orden: { ...estado().cuentos.orden, [dia]: ids } } }, true);
  return ids;
}

// The next story of today that has not happened yet.
export function siguiente(): Cuento | null {
  const { dia, cuentos } = estado();
  const id = orden(dia).find((x) => !cuentos.hechos[x]);
  return id ? cuento(id) : null;
}

// Stories of today at this time of day that have not happened yet.
export function pendientes(hora: Hora = estado().hora): number {
  const { dia, cuentos } = estado();
  return orden(dia).filter((id) => cuento(id).hora === hora && !cuentos.hechos[id]).length;
}

// The next story starts when the child is in its place, at its time of day, after the pause.
export function tocaAqui(lugar: string, x: number, y: number): Cuento | null {
  const c = siguiente();
  if (!c || c.hora !== estado().hora) return null;
  const s = sitio(c.id);
  if (s.mapa !== lugar) return null;
  if (s.zona && !(x >= s.zona.x && x <= s.zona.x + s.zona.w && y >= s.zona.y && y <= s.zona.y + s.zona.h)) return null;
  const { finMedio, finUltimo } = estado().cuentos;
  if (finMedio && Date.now() - finMedio < PAUSA_TRAS_MEDIO) return null;
  if (finUltimo && Date.now() - finUltimo < PAUSA_ENTRE) return null;
  return c;
}

export function terminar(id: string, como: "terminado" | "ahora_no") {
  const c = estado().cuentos;
  const ahora = Date.now();
  cambiarEstado({ cuentos: { ...c, hechos: { ...c.hechos, [id]: como }, finMedio: cuento(id).intensidad === "media" ? ahora : c.finMedio, finUltimo: ahora } }, true);
}
