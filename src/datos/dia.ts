// Days and times of day (GDD §4, §5). Time never moves by itself: it moves when the child reaches
// the place that closes each part of the day.
//   morning → afternoon: leaving the school for the street
//   afternoon → night: coming home
//   night → next day: going to bed
// H5 adds the stories of each part of the day before it can move on.
import { estado, cambiarEstado, type Hora } from "./guardado";
import { registrar } from "./eventos";

export const DIAS = 3;

export function alCruzar(desde: string, hacia: string): Hora | null {
  const { hora } = estado();
  if (hora === "manana" && desde === "escuela_patio" && hacia === "calle") return pasarA("tarde");
  if (hora === "tarde" && hacia === "casa") return pasarA("noche");
  return null;
}

// Doors open by time of day; at night nobody leaves the house.
export function puertaAbierta(horas: string | undefined, desde: string): boolean {
  const { hora } = estado();
  if (hora === "noche" && desde === "casa") return false;
  return !horas || horas.split(",").includes(hora);
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
