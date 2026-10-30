// npm test: the story's rules on their own, with no saved game and no story file behind them: objectives in order, a
// scene that pauses and goes on at its line, a reminder at a door that shows once, the variants, and old saves.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Escena, Hito, Pendiente } from "virtual:contenido";
import { cerrarEscena, completarHistoria, cumpleTras, escenaPendiente, escenasDisponibles, esperaTras, hitoActual, pasoDeEscena, pendienteAbierta } from "./progreso.ts";

const escena = (x: Partial<Escena> & { id: string; donde: string; al: string }) => ({ nombre: x.id, pasos: [], ...x }) as Escena;

test("desde partida nueva, cada parte del día lleva sus objetivos en orden", () => {
  const hitos: Hito[] = [
    { dia: 1, hora: "manana", lugar: "casa", mision: "Despertar", etiqueta: "Casa", cumple: ["T03", "T05", "T05b"] },
    { dia: 1, hora: "manana", lugar: "casa", objeto: "mama", mision: "Hablar con mamá", etiqueta: "Mamá", cumple: ["T05", "T05b"] },
    { dia: 1, hora: "manana", lugar: "casa", puertaDestino: "calle", mision: "Salir a la escuela", etiqueta: "Puerta", cumple: "T09" },
  ];
  const mision = (hechas: string[]) => hitoActual(hitos, hechas, 1, "manana")?.mision;
  assert.equal(mision([]), "Despertar");
  assert.equal(mision(["T03"]), "Hablar con mamá");
  assert.equal(mision(["T03", "T05b"]), "Salir a la escuela"); // la variante de mamá también cumple el objetivo
  assert.equal(hitoActual(hitos, ["T03"], 1, "tarde"), undefined); // cada parte del día tiene los suyos
});

test("pausar guarda la línea y volver empieza ahí; terminar la cierra", () => {
  let h = cerrarEscena(completarHistoria({}), "T05", false, 3);
  assert.equal(pasoDeEscena(h, "T05"), 3);
  assert.deepEqual(h.hechas, []);
  h = cerrarEscena(h, "T05", true, 6);
  assert.equal(pasoDeEscena(h, "T05"), 0);
  assert.deepEqual(h.hechas, ["T05"]);
  assert.deepEqual(h.progreso, {});
});

test("una escena ya hecha no vuelve a guardar su línea", () => {
  const h = cerrarEscena(completarHistoria({ hechas: ["R-estufa"] }), "R-estufa", false, 2);
  assert.deepEqual(h.progreso, {});
});

test("un recordatorio de salida se ve una vez: al aparecer queda visto y el siguiente intento sale", () => {
  const escenas = [escena({ id: "R-estufa", donde: "casa", al: "salir:calle", si: ["estufa_prendida"], no: ["estufa_apagada"], frena: true })];
  let h = completarHistoria({ marcas: ["estufa_prendida"] });
  // Como en Mundo.tsx: el recordatorio queda hecho al aparecer, antes de que el jugador responda.
  const intento = () => {
    const e = escenasDisponibles(escenas, h, 1, "manana", "casa", "salir:calle")[0];
    if (e) h = cerrarEscena(h, e.id, true, 0);
    return e?.id ?? "sale";
  };
  assert.equal(intento(), "R-estufa");
  assert.equal(intento(), "sale");
});

test("un pendiente se abre con su marca y se cierra con la suya, solo en su lugar", () => {
  const pendientes: Pendiente[] = [{ id: "apagar-estufa", abre: "estufa_prendida", cierra: "estufa_apagada", lugar: "casa", objeto: "estufa", etiqueta: "Estufa", mision: "Apagar la estufa" }];
  assert.equal(pendienteAbierta(pendientes, completarHistoria({ marcas: ["estufa_prendida"] }), "casa")?.id, "apagar-estufa");
  assert.equal(pendienteAbierta(pendientes, completarHistoria({ marcas: ["estufa_prendida"] }), "calle"), null);
  assert.equal(pendienteAbierta(pendientes, completarHistoria({ marcas: ["estufa_prendida", "estufa_apagada"] }), "casa"), null);
});

test("tras: sin tras se puede empezar; con una lista basta con que una esté hecha", () => {
  assert.equal(cumpleTras(undefined, []), true);
  assert.equal(cumpleTras(["U01a", "U01b"], []), false);
  assert.equal(cumpleTras(["U01a", "U01b"], ["U01b"]), true);
  assert.equal(cumpleTras("T05", []), false);
});

test("la variante cambia con la marca, y ninguna repite la conversación ya hecha", () => {
  const escenas = [
    escena({ id: "T05", donde: "casa", al: "mama", dia: 1, hora: "manana", no: ["saco_huevos"] }),
    escena({ id: "T05b", donde: "casa", al: "mama", dia: 1, hora: "manana", si: ["saco_huevos"], no: ["hablo_mama"] }),
  ];
  const ids = (marcas: string[]) => escenasDisponibles(escenas, completarHistoria({ marcas }), 1, "manana", "casa", "mama").map((x) => x.id);
  assert.deepEqual(ids([]), ["T05"]);
  assert.deepEqual(ids(["saco_huevos"]), ["T05b"]);
  assert.deepEqual(ids(["saco_huevos", "hablo_mama"]), []);
});

test("tocar algo cuya escena espera a otra lo señala; si no espera nada, no", () => {
  const escenas = [escena({ id: "T07", donde: "casa", al: "estufa", dia: 1, hora: "manana", tras: "T06" })];
  const h = completarHistoria({});
  assert.deepEqual(escenasDisponibles(escenas, h, 1, "manana", "casa", "estufa"), []);
  assert.equal(esperaTras(escenas, h, 1, "manana", "casa", "estufa"), true);
  assert.equal(esperaTras(escenas, h, 2, "manana", "casa", "estufa"), false);
  assert.equal(esperaTras(escenas, completarHistoria({ hechas: ["T06"] }), 1, "manana", "casa", "estufa"), false);
});

test("una escena que espera una marca no anuncia espera ni frena la cama", () => {
  const escenas = [escena({ id: "E2-04", donde: "casa", al: "cama", dia: 2, hora: "noche", si: ["visto_papa"] })];
  assert.equal(esperaTras(escenas, completarHistoria({}), 2, "noche", "casa", "cama"), false);
  assert.deepEqual(escenasDisponibles(escenas, completarHistoria({ marcas: ["visto_papa"] }), 2, "noche", "casa", "cama").map((x) => x.id), ["E2-04"]);
});

test("una persona de la casa se ve mientras quede algo que decirle", () => {
  const escenas = [escena({ id: "T05", donde: "casa", al: "mama", dia: 1, hora: "manana" })];
  assert.equal(escenaPendiente(escenas, completarHistoria({}), 1, "manana", "casa", "mama"), true);
  assert.equal(escenaPendiente(escenas, completarHistoria({ hechas: ["T05"] }), 1, "manana", "casa", "mama"), false);
});

test("una partida guardada de antes abre sin cambios y sin líneas guardadas", () => {
  assert.deepEqual(completarHistoria({ hechas: ["T03", "T05"], marcas: ["hablo_mama"], mision: "Sacar los huevos" }), {
    hechas: ["T03", "T05"],
    marcas: ["hablo_mama"],
    mision: "Sacar los huevos",
    progreso: {},
  });
});
