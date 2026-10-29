// npm test: the dashboard's counts on a few made-up events.
import { test } from "node:test";
import assert from "node:assert/strict";
import { porParticipante, resumen, codigosPorArea, referencia, escenas, minijuegos, usoPorPantalla, aparienciaDe, avance, type Evento, type Contenido } from "./calculos.ts";

let id = 0;
const ev = (nino: string, tipo: string, t_ms: number, datos: Record<string, unknown> = {}): Evento => ({ nino, id: ++id, tipo, sesion: 1, t_ms, cuando: 1000 + t_ms, ...datos });
const C: Contenido = {
  escenas: [{ id: "T05", nombre: "Conversación con la madre", areas: ["conducta", "pedir_ayuda"] }],
  areas: [{ id: "conducta", nombre: "Conducta" }],
  objetos: {},
};
const eventos = [
  ev("a", "pantalla", 0, { pantalla: "creacion" }),
  ev("a", "personaje", 5000, { cuerpo: "nina", tono: 3, cabello: "02", color_cabello: 1, ropa: "uniforme_falda", extras: ["mochila"], color_mochila: 2, colores: { sueter: 3, uniforme_abajo: 1, tenis: 2 } }),
  ev("a", "pantalla", 9000, { pantalla: "mundo" }),
  ev("a", "toque_sin_efecto", 9500, { pantalla: "mundo" }),
  ev("a", "escena", 10000, { escena: "T05", paso: "inicio" }),
  ev("a", "escena", 11000, { escena: "T05", paso: "opcion", de: "madre", opciones: ["PREGUNTA", "PIDE_AYUDA"], elegida: "PIDE_AYUDA", ms_decidir: 4100 }),
  ev("a", "minijuego", 12000, { minijuego: "ropero", resultado: "completado", ms: 2500, codigo: "ELIGE_DEPORTE" }),
  ev("a", "escena", 13000, { escena: "T05", paso: "fin", saltada: true }),
  ev("b", "escena", 1000, { escena: "T05", paso: "opcion", de: "madre", opciones: ["PREGUNTA", "EVITA"], elegida: "EVITA", ms_decidir: 2000 }),
  ev("b", "tramo", 2000, { dia: 2, hora: "manana" }),
];

test("cuenta por participante, por área, la referencia de todos y lo que eligió en cada escena", () => {
  const g = porParticipante(eventos);
  const r = resumen("a", g.get("a")!);
  assert.equal(r.respuestas, 1);
  assert.equal(r.minijuegos, 1);
  assert.equal(resumen("b", g.get("b")!).respuestas, 1);
  assert.equal(r.ultimaPantalla, "mundo");
  const a = codigosPorArea(g.get("a")!, C);
  assert.equal(a.get("conducta")!.get("PIDE_AYUDA")!.n, 1);
  assert.equal(a.get("pedir_ayuda")!.get("PIDE_AYUDA")!.n, 1);
  const todos = [...g.values()].map((evs) => codigosPorArea(evs, C));
  assert.deepEqual(referencia(todos, "conducta", "PIDE_AYUDA"), { N: 2, mediana: 0.5, min: 0, max: 1 });
  assert.deepEqual(escenas(g.get("a")!).get("T05"), { veces: 1, saltada: 1, pausada: 0, elecciones: [{ codigo: "PIDE_AYUDA", de: "madre", segundos: 4.1 }], cierres: [] });
  assert.deepEqual(minijuegos(g.get("a")!), [{ minijuego: "ropero", resultado: "completado", segundos: 2.5, codigo: "ELIGE_DEPORTE" }]);
});

test("uso por pantalla, avance y apariencia", () => {
  const g = porParticipante(eventos);
  const mundo = usoPorPantalla(g).find((f) => f.pantalla === "mundo")!;
  assert.equal(mundo.sinEfecto, 1);
  assert.equal(mundo.segundos, 4); // 9 s to the last event at 13 s
  assert.deepEqual(avance(g).map((p) => p.n), [1, 1, 1, 0, 0]);
  assert.deepEqual(aparienciaDe(g.get("a")!), { cuerpo: "nina", cabello: "02", ropa: "uniforme", abajo: "falda", extras: ["mochila"], colores: { sueter: 2, uniforme_abajo: 0, tenis: 1, piel: 2, cabello: 0, mochila: 1 } });
});
