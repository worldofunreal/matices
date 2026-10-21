// npm test: the dashboard's counts on a few made-up events.
import { test } from "node:test";
import assert from "node:assert/strict";
import { porParticipante, resumen, codigosPorArea, referencia, usoPorPantalla, aparienciaDe, avance, type Evento, type Contenido } from "./calculos.ts";

let id = 0;
const ev = (nino: string, tipo: string, t_ms: number, datos: Record<string, unknown> = {}): Evento => ({ nino, id: ++id, tipo, sesion: 1, t_ms, cuando: 1000 + t_ms, ...datos });
const C: Contenido = {
  cuentos: [{ id: "E01", titulo: "Fiebre", area_principal: "necesidades_fisicas", areas: ["pedir_ayuda"] }],
  areas: [{ id: "necesidades_fisicas", nombre: "Necesidades físicas" }],
  sobreMi: { frases: [] },
  objetos: {},
};
const eventos = [
  ev("a", "pantalla", 0, { pantalla: "creacion" }),
  ev("a", "personaje", 5000, { cuerpo: "nina", tono: 3, cabello: "02", color_cabello: 1, ropa: "uniforme_falda", extras: ["mochila"], color_mochila: 2, colores: { sueter: 3, uniforme_abajo: 1, tenis: 2 } }),
  ev("a", "pantalla", 9000, { pantalla: "mundo" }),
  ev("a", "toque_sin_efecto", 9500, { pantalla: "mundo" }),
  ev("a", "cuento_paso", 10000, { cuento: "E01", paso: "que_hace", elegida: "AUSENTE", ms_decidir: 4000 }),
  ev("a", "cuento_paso", 12000, { cuento: "E01", paso: "luego", elegida: "AUSENTE", ms_decidir: 900 }),
  ev("a", "cuento", 13000, { cuento: "E01", que: "fin" }),
  ev("b", "cuento_paso", 1000, { cuento: "E01", paso: "que_hace", elegida: "PROTEGE", ms_decidir: 2000 }),
  ev("b", "tramo", 2000, { dia: 2, hora: "manana" }),
];

test("cuenta por participante, por área y la referencia de todos", () => {
  const g = porParticipante(eventos);
  const r = resumen("a", g.get("a")!);
  assert.equal(r.terminados, 1);
  assert.equal(r.ultimaPantalla, "mundo");
  const a = codigosPorArea(g.get("a")!, C);
  assert.equal(a.get("necesidades_fisicas")!.get("AUSENTE")!.n, 2);
  assert.equal(a.get("pedir_ayuda")!.get("AUSENTE")!.n, 2);
  const todos = [...g.values()].map((evs) => codigosPorArea(evs, C));
  assert.deepEqual(referencia(todos, "necesidades_fisicas", "AUSENTE"), { N: 2, mediana: 1, min: 0, max: 2 });
});

test("uso por pantalla, avance y apariencia", () => {
  const g = porParticipante(eventos);
  const mundo = usoPorPantalla(g).find((f) => f.pantalla === "mundo")!;
  assert.equal(mundo.sinEfecto, 1);
  assert.equal(mundo.segundos, 4); // 9 s to the last event at 13 s
  assert.deepEqual(avance(g).map((p) => p.n), [1, 0, 1, 1, 0, 0]);
  assert.deepEqual(aparienciaDe(g.get("a")!), { cuerpo: "nina", cabello: "02", ropa: "uniforme", abajo: "falda", extras: ["mochila"], colores: { sueter: 2, uniforme_abajo: 0, tenis: 1, piel: 2, cabello: 0, mochila: 1 } });
});
