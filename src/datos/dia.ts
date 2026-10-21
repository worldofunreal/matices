// Days and times of day (GDD §4). Time never moves by itself: it moves when the child reaches
// the place that closes each part of the day.
//   morning → afternoon: leaving the school for the street
//   afternoon → night: being at home
//   night → next day: going to bed
import { estado, cambiarEstado, type Hora } from "./guardado";
import { registrar } from "./eventos";

export const DIAS = 3;

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
  if (hora === "manana" && desde === "escuela_patio" && lugar === "calle") return pasarA("tarde");
  if (hora === "tarde" && lugar === "casa") return pasarA("noche");
  return null;
}

function pasarA(hora: Hora): Hora {
  cambiarEstado({ hora }, true);
  registrar("tramo", { dia: estado().dia, hora });
  return hora;
}

// Going to bed at night ends the day. Returns the new day, or null after the last one.
export function dormir(): number | null {
  const { dia } = estado();
  if (dia >= DIAS) {
    registrar("tramo", { dia, hora: "fin" });
    return null;
  }
  cambiarEstado({ dia: dia + 1, hora: "manana", lugar: "casa", x: null, y: null, llegada: null }, true);
  registrar("tramo", { dia: dia + 1, hora: "manana" });
  return dia + 1;
}
