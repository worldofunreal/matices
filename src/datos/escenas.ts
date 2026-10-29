// The story (contenido/escenas.yaml): which scene starts where the child is, what it leaves behind,
// and where the active mission guides the child next.
import contenido, { type Escena } from "virtual:contenido";
import { estado, cambiarEstado, type Hora } from "./guardado";

const cumple = (lista: string[] | undefined, marcas: string[], que: boolean) => (lista ?? []).every((m) => marcas.includes(m) === que);

const ALIAS_OBJETO: Record<string, string> = {
  mama: "mesa",
  papa: "sillon",
};

export interface Objetivo {
  lugar: string;
  objeto?: string;
  puertaDestino?: string;
  mision: string;
  etiqueta: string;
}

// Self-heals out-of-sync saves and keeps the top mission banner aligned with the current story step.
export function sincronizarHistoria(): Objetivo {
  const e = estado();
  const h = e.historia.hechas;
  let dia = e.dia;
  let hora: Hora = e.hora;

  if (!h.includes("T09") || !h.includes("R02-leo")) {
    dia = 1;
    hora = "manana";
  } else if (dia === 2 && hora !== "manana" && !h.includes("R05")) {
    hora = "manana";
  } else if (dia === 3 && !h.includes("E2-04")) {
    dia = 2;
    hora = "noche";
  }

  if (dia !== e.dia || hora !== e.hora) {
    cambiarEstado({ dia, hora }, true);
  }

  const obj = objetivoActual();
  if (estado().historia.mision !== obj.mision) {
    cambiarEstado({ historia: { ...estado().historia, mision: obj.mision } }, true);
  }
  return obj;
}

// The first pending thing the child left open in the place it is in (contenido/escenas.yaml, pendientes): it leads the
// mission and the guide until its closing mark is given. Anywhere else the story's own goal shows.
export function pendienteAbierta() {
  const { lugar, historia } = estado();
  return contenido.pendientes.find((p) => p.lugar === lugar && historia.marcas.includes(p.abre) && !historia.marcas.includes(p.cierra)) ?? null;
}

// Returns the exact current goal (place, target object/person or door, mission banner and guide badge). An open
// pending thing comes first.
export function objetivoActual(): Objetivo {
  const abierta = pendienteAbierta();
  if (abierta) return { lugar: abierta.lugar, objeto: abierta.objeto, mision: abierta.mision, etiqueta: abierta.etiqueta };
  const { dia, hora, historia } = estado();
  const h = historia.hechas;

  // Día 1 — Mañana
  if (dia === 1 && hora === "manana") {
    if (!h.includes("T03") && !h.includes("T05")) {
      return { lugar: "casa", mision: "Despertar en tu habitación", etiqueta: "Casa" };
    }
    if (!h.includes("T05")) {
      return { lugar: "casa", objeto: "mama", mision: "Hablar con mamá en el comedor", etiqueta: "Hablar con Mamá" };
    }
    if (!h.includes("T06")) {
      return { lugar: "casa", objeto: "refrigerador", mision: "Sacar los huevos del refrigerador en la cocina", etiqueta: "Refrigerador" };
    }
    if (!h.includes("T07")) {
      return { lugar: "casa", objeto: "estufa", mision: "Preparar el desayuno en la estufa", etiqueta: "Estufa" };
    }
    if (!h.includes("T08")) {
      return { lugar: "casa", objeto: "ropero", mision: "Elegir tu ropa en el ropero de tu habitación", etiqueta: "Ropero" };
    }
    if (!h.includes("T09")) {
      return { lugar: "casa", puertaDestino: "calle", mision: "Salir de casa rumbo a la escuela", etiqueta: "Salir a la calle" };
    }
    if (!h.includes("U01a") && !h.includes("U01b")) {
      return { lugar: "escuela_planta_baja", mision: "Ir a la escuela", etiqueta: "Escuela" };
    }
    if (!h.includes("R01")) {
      return { lugar: "escuela_planta_baja", mision: "Salir al patio de la escuela para el recreo", etiqueta: "Patio" };
    }
    if (!h.includes("R02-valeria")) {
      return { lugar: "escuela_planta_baja", objeto: "companero_1", mision: "Hablar con Valeria en el patio de la escuela", etiqueta: "Valeria" };
    }
    if (!h.includes("R02-leo")) {
      return { lugar: "escuela_planta_baja", objeto: "companero_2", mision: "Hablar con Leo en el patio de la escuela", etiqueta: "Leo" };
    }
    if (!h.includes("R02-sam")) {
      return { lugar: "escuela_planta_baja", objeto: "companero_3", mision: "Hablar con Sam en los salones de la planta baja", etiqueta: "Sam" };
    }
    return { lugar: "calle", mision: "Salir de la escuela a la calle para volver a casa", etiqueta: "Salir a la calle" };
  }

  // Día 1 — Tarde y Noche
  if (dia === 1 && hora === "tarde") {
    if (!h.includes("C03")) {
      return { lugar: "calle", mision: "Salir a la calle para ayudar con las compras", etiqueta: "Calle" };
    }
    return { lugar: "casa", mision: "Regresar a casa para descansar", etiqueta: "Casa" };
  }
  if (dia === 1 && hora === "noche") {
    return { lugar: "casa", objeto: "cama", mision: "Ir a tu cama para dormir", etiqueta: "A dormir" };
  }

  // Día 2 — Mañana
  if (dia === 2 && hora === "manana") {
    if (!h.includes("X01")) {
      return { lugar: "escuela_planta_baja", mision: "Ir a la escuela para el examen", etiqueta: "Escuela" };
    }
    if (!h.includes("R05")) {
      return { lugar: "escuela_planta_baja", objeto: "companero_2", mision: "Hablar con Leo en el patio de la escuela", etiqueta: "Leo" };
    }
    return { lugar: "calle", mision: "Salir de la escuela para regresar a casa", etiqueta: "Salir a la calle" };
  }

  // Día 2 — Tarde y Noche
  if (dia === 2 && hora === "tarde") {
    return { lugar: "casa", mision: "Regresar a casa después de clases", etiqueta: "Casa" };
  }
  if (dia === 2 && hora === "noche") {
    if (!h.includes("E2-01")) {
      return { lugar: "casa", objeto: "cama", mision: "Ir a tu cama para dibujar un rato", etiqueta: "Dibujar" };
    }
    if (!h.includes("E2-02")) {
      return { lugar: "casa", objeto: "papa", mision: "Enseñar el dibujo a papá en la sala", etiqueta: "Hablar con Papá" };
    }
    if (!h.includes("E2-04")) {
      return { lugar: "casa", objeto: "cama", mision: "Regresar a tu cama en tu habitación", etiqueta: "Ir a la cama" };
    }
    return { lugar: "casa", objeto: "cama", mision: "Dormir en tu cama para descansar", etiqueta: "A dormir" };
  }

  // Día 3 — Mañana
  if (dia === 3 && hora === "manana") {
    if (!h.includes("E2-05")) {
      return { lugar: "escuela_planta_baja", objeto: "companero_2", mision: "Ir al patio de la escuela para hablar con Leo", etiqueta: "Leo" };
    }
    if (!h.includes("O01")) {
      return { lugar: "escuela_planta_baja", objeto: "orientadora", mision: "Hablar con la orientadora en la planta baja", etiqueta: "Orientadora" };
    }
    if (!h.includes("C02")) {
      return { lugar: "escuela_planta_baja", mision: "Preparar el proyecto en parejas en el salón", etiqueta: "Escuela" };
    }
    return { lugar: "calle", mision: "Salir de la escuela para regresar a casa", etiqueta: "Salir a la calle" };
  }

  // Día 3 — Tarde y Noche
  if (dia === 3 && hora === "tarde") {
    return { lugar: "casa", mision: "Regresar a casa", etiqueta: "Casa" };
  }
  return { lugar: "casa", objeto: "cama", mision: "Dormir en tu cama para terminar la historia", etiqueta: "A dormir" };
}

// Friendly hint when the child touches an object before its step. Leaving a place is held by scenes (frena, in contenido/escenas.yaml).
export function pistaPaso(lugar: string, al: string): string | null {
  const { dia, hora, historia } = estado();
  const h = historia.hechas;

  if (lugar === "casa" && dia === 1 && hora === "manana") {
    if (al === "refrigerador" && !h.includes("T05")) {
      return "Mamá está en el comedor; primero voy a preguntarle qué dejó para desayunar.";
    }
    if (al === "estufa" && !h.includes("T06")) {
      if (!h.includes("T05")) return "Primero voy a hablar con mamá en el comedor.";
      return "Primero tengo que sacar los huevos del refrigerador que está aquí al lado.";
    }
    if (al === "ropero" && !h.includes("T07")) {
      return "Primero voy a desayunar en la cocina y luego elijo mi ropa.";
    }
  }

  if (lugar === "casa" && al === "cama" && dia === 2 && hora === "noche") {
    if (h.includes("E2-01") && !h.includes("E2-02")) {
      return "Antes de dormir, quiero enseñarle mi dibujo a papá en la sala.";
    }
  }

  return null;
}

// The scene that starts now at `al` (a place: "entrar" or "salir:<lugar>"; or an object or a person touched), or null.
export function escenaPara(lugar: string, al: string): Escena | null {
  const { dia, hora, historia } = estado();
  const objetivo = ALIAS_OBJETO[al] ?? al;
  return (
    contenido.escenas.find((x) => {
      const tras = ([] as string[]).concat(x.tras ?? []);
      return (
        x.donde === lugar &&
        x.al === objetivo &&
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
  if (hecha && !h.hechas.includes(id)) {
    const hechas = [...h.hechas, id];
    if (id === "T05" && !hechas.includes("T03")) hechas.push("T03");
    cambiarEstado({ historia: { ...h, hechas } }, true);
  }
  sincronizarHistoria();
}
