// Who watches the child. A vigilant person or animal turns to face the child, on whichever side the child stands.
import type { Punto } from "./mapa";

// Vigilant by themselves: "siempre" is always, "objetivo" only while a main or secondary goal points at them.
// Mamá and papá are not objects on the map, so their metadata lives here, by name.
const VIGILANTES: Record<string, "siempre" | "objetivo"> = {
  mama: "siempre",
  papa: "siempre",
  companero_1: "objetivo",
  companero_2: "objetivo",
  companero_3: "objetivo",
  companero_4: "objetivo",
};

// `objetivos`: the points a main or secondary goal points at right now. A scene marks anyone with `vigila_<nombre>`.
export function esVigilante(p: Punto, objetivos: ReadonlySet<Punto>, marcas: string[]): boolean {
  const modo = VIGILANTES[p.nombre];
  return modo === "siempre" || (modo === "objetivo" && objetivos.has(p)) || marcas.includes(`vigila_${p.nombre}`);
}
