// Days and times of day. Time never moves by itself: it moves when the child reaches
// the place that closes each part of the day.
//   morning → afternoon: leaving the school for the street
//   afternoon → night: being at home
//   night → next day: going to bed
// After the days of the story (DIAS) come the free days, all alike (docs/diseno.md).
import { estado, cambiarEstado, type Hora } from "./guardado";
import { registrar } from "./eventos";
import { DIAS } from "./progreso";

// Why a door can't be crossed now, or null. Texts in contenido/textos.yaml, section mundo.
export function bloqueo(desde: string, horas: string | undefined): "noche" | "cerrado" | null {
  const { hora } = estado();
  if (hora === "noche" && desde === "casa") return "noche";
  if (horas && !horas.split(",").includes(hora)) return "cerrado";
  return null;
}

// After crossing a door: moves on to the next part of the day if it is time.
export function revisarHora(lugar: string, desde?: string): Hora | null {
  const { hora } = estado();
  if (hora === "manana" && desde === "escuela_planta_baja" && lugar === "calle") return pasarA("tarde");
  if (hora === "tarde" && lugar === "casa") return pasarA("noche");
  return null;
}

function pasarA(hora: Hora): Hora {
  cambiarEstado({ hora }, true);
  registrar("tramo", { dia: estado().dia, hora });
  return hora;
}

// Going to bed at night ends the day. `fin`: the night that just ended was the story's last one.
export function dormir(): { dia: number; fin: boolean } {
  const { dia } = estado();
  const fin = dia === DIAS;
  if (fin) registrar("tramo", { dia, hora: "fin" });
  cambiarEstado({ dia: dia + 1, hora: "manana", lugar: "casa", x: null, y: null, llegada: null }, true);
  registrar("tramo", { dia: dia + 1, hora: "manana" });
  return { dia: dia + 1, fin };
}
