// The story (contenido/escenas.yaml): which scene starts where the child is, and what it leaves behind.
// A scene starts once, when its place, its moment and its marks match; then it never starts again.
import contenido, { type Escena } from "virtual:contenido";
import { estado, cambiarEstado } from "./guardado";

const cumple = (lista: string[] | undefined, marcas: string[], que: boolean) => (lista ?? []).every((m) => marcas.includes(m) === que);

// The scene that starts now at `al` (a place: "entrar" or "salir:<lugar>"; or an object or a person touched), or null.
export function escenaPara(lugar: string, al: string): Escena | null {
  const { dia, hora, historia } = estado();
  return (
    contenido.escenas.find((x) => {
      const tras = ([] as string[]).concat(x.tras ?? []);
      return (
        x.donde === lugar &&
        x.al === al &&
        (x.dia === undefined || x.dia === dia) &&
        (x.hora === undefined || x.hora === hora) &&
        !historia.hechas.includes(x.id) &&
        (tras.length === 0 || tras.some((t) => historia.hechas.includes(t))) &&
        cumple(x.si, historia.marcas, true) &&
        cumple(x.no, historia.marcas, false)
      );
    }) ?? null
  );
}

// The words marked {o} follow the child's body: "list{o}" is "listo" or "lista" (contenido/README.md).
export const conGenero = (texto: string) => texto.replace(/\{o\}/g, estado().apariencia.cuerpo === "nina" ? "a" : "o");

export const marcar = (marca: string) => {
  const h = estado().historia;
  if (!h.marcas.includes(marca)) cambiarEstado({ historia: { ...h, marcas: [...h.marcas, marca] } }, true);
};

export function mision(texto: string) {
  cambiarEstado({ historia: { ...estado().historia, mision: texto } }, true);
}

// A scene is over (finished, skipped or paused): finished and skipped ones never come back.
export function terminarEscena(id: string, hecha: boolean) {
  const h = estado().historia;
  if (hecha && !h.hechas.includes(id)) cambiarEstado({ historia: { ...h, hechas: [...h.hechas, id] } }, true);
}
