// npm test: the dashboard's counts on a few made-up events.
import { test } from "node:test";
import assert from "node:assert/strict";
import { porParticipante, resumen, codigosPorArea, referencia, situaciones, usoPorPantalla, aparienciaDe, avance, type Evento, type Contenido } from "./calculos.ts";

let id = 0;
const ev = (nino: string, tipo: string, t_ms: number, datos: Record<string, unknown> = {}): Evento => ({ nino, id: ++id, tipo, sesion: 1, t_ms, cuando: 1000 + t_ms, ...datos });
const C: Contenido = {
  situaciones: [{ id: "S01", nombre: "Correr en la casa", areas: ["conducta", "pedir_ayuda"] }],
  areas: [{ id: "conducta", nombre: "Conducta" }],
  objetos: {},
};
const eventos = [
  ev("a", "pantalla", 0, { pantalla: "creacion" }),
  ev("a", "personaje", 5000, { cuerpo: "nina", tono: 3, cabello: "02", color_cabello: 1, ropa: "uniforme_falda", extras: ["mochila"], color_mochila: 2, colores: { sueter: 3, uniforme_abajo: 1, tenis: 2 } }),
  ev("a", "pantalla", 9000, { pantalla: "mundo" }),
  ev("a", "toque_sin_efecto", 9500, { pantalla: "mundo" }),
  ev("a", "situacion", 10000, { situacion: "S01", paso: "aviso", quien: "FIGURA:abuela", veces: 1 }),
  ev("a", "situacion", 11000, { situacion: "S01", paso: "pregunta", quien: "FIGURA:abuela", veces: 2 }),
  ev("a", "situacion", 12000, { situacion: "S01", paso: "respuesta", quien: "FIGURA:abuela", elegida: "PROMETE", ms_decidir: 4100 }),
  ev("a", "situacion", 13000, { situacion: "S01", paso: "repite", quien: "FIGURA:abuela", veces: 3, tras: "PROMETE" }),
  ev("b", "situacion", 1000, { situacion: "S01", paso: "respuesta", quien: "FIGURA:papa", elegida: "IGNORA", ms_decidir: 2000 }),
  ev("b", "tramo", 2000, { dia: 2, hora: "manana" }),
];

test("cuenta por participante, por área, la referencia de todos y lo que hizo después de contestar", () => {
  const g = porParticipante(eventos);
  const r = resumen("a", g.get("a")!);
  assert.equal(r.respuestas, 1);
  assert.equal(resumen("b", g.get("b")!).ignora, 1);
  assert.equal(r.ultimaPantalla, "mundo");
  const a = codigosPorArea(g.get("a")!, C);
  assert.equal(a.get("conducta")!.get("PROMETE")!.n, 1);
  assert.equal(a.get("pedir_ayuda")!.get("PROMETE")!.n, 1);
  const todos = [...g.values()].map((evs) => codigosPorArea(evs, C));
  assert.deepEqual(referencia(todos, "conducta", "PROMETE"), { N: 2, mediana: 0.5, min: 0, max: 1 });
  assert.deepEqual(situaciones(g.get("a")!).get("S01"), { veces: 3, quien: ["FIGURA:abuela"], respuestas: [{ codigo: "PROMETE", segundos: 4.1 }], despues: 1 });
});

test("uso por pantalla, avance y apariencia", () => {
  const g = porParticipante(eventos);
  const mundo = usoPorPantalla(g).find((f) => f.pantalla === "mundo")!;
  assert.equal(mundo.sinEfecto, 1);
  assert.equal(mundo.segundos, 4); // 9 s to the last event at 13 s
  assert.deepEqual(avance(g).map((p) => p.n), [1, 0, 1, 1, 0, 0]);
  assert.deepEqual(aparienciaDe(g.get("a")!), { cuerpo: "nina", cabello: "02", ropa: "uniforme", abajo: "falda", extras: ["mochila"], colores: { sueter: 2, uniforme_abajo: 0, tenis: 1, piel: 2, cabello: 0, mochila: 1 } });
});
