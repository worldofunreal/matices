// Everyday situations (GDD §9, contenido/situaciones.yaml). The child does something; the first time,
// someone says a line; the next time, they ask and the child answers or walks away (IGNORA). After an
// answer, every repeat is logged against it. Nothing here stops the world.
import contenido, { type Opcion } from "virtual:contenido";
import { estado, cambiarEstado } from "./guardado";
import { registrar, semilla } from "./eventos";
import { azar } from "./azar";

export type Reaccion = { situacion: string; texto: string; clave: string; respuestas: Opcion[] | null };

const porId = new Map(contenido.situaciones.map((s) => [s.id, s]));

// The child did it once more. `quien` is the code of who reacts (FIGURA:<inst>) or NADIE.
export function ocurre(id: string, quien: string): Reaccion | null {
  const s = porId.get(id)!;
  const antes = estado().situaciones[id] ?? { veces: 0, respuesta: null };
  const veces = antes.veces + 1;
  cambiarEstado({ situaciones: { ...estado().situaciones, [id]: { ...antes, veces } } }, true);
  const aviso = { situacion: id, texto: s.aviso, clave: `situaciones.${id}.aviso`, respuestas: null };
  if (antes.respuesta) {
    registrar("situacion", { situacion: id, paso: "repite", quien, veces, tras: antes.respuesta });
    return quien === "NADIE" ? null : aviso;
  }
  if (veces === 1 || quien === "NADIE") {
    registrar("situacion", { situacion: id, paso: "aviso", quien, veces });
    return quien === "NADIE" ? null : aviso;
  }
  // Shown in an order of its own per child, so no answer is always the first one.
  const respuestas = azar(`${semilla()}-${id}`).barajar(s.respuestas);
  registrar("situacion", { situacion: id, paso: "pregunta", quien, veces, opciones: respuestas.map((r) => r[0]) });
  return { situacion: id, texto: s.pregunta, clave: `situaciones.${id}.pregunta`, respuestas };
}

// The answer (or IGNORA, walking away), with the time since the answers appeared.
export function responder(r: Reaccion, quien: string, codigo: string, ms: number) {
  registrar("situacion", { situacion: r.situacion, paso: "respuesta", quien, opciones: r.respuestas?.map((o) => o[0]), elegida: codigo, ms_decidir: Math.round(ms) });
  const antes = estado().situaciones[r.situacion];
  cambiarEstado({ situaciones: { ...estado().situaciones, [r.situacion]: { ...antes, respuesta: codigo } } }, true);
}
