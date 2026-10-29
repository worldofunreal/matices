// npm test: who turns to face the child. Their metadata and the scene marks decide it, never the distance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { esVigilante } from "./vigilancia.ts";
import type { Punto } from "./mapa.ts";

const persona = (nombre: string): Punto => ({ nombre, tipo: "npc", x: 100, y: 100, arte: `personajes/${nombre}` });
const nadie = new Set<Punto>();

test("mamá y papá siempre vigilan; un vecino sin marca no", () => {
  assert.equal(esVigilante(persona("mama"), nadie, []), true);
  assert.equal(esVigilante(persona("papa"), nadie, []), true);
  assert.equal(esVigilante(persona("vecino_1"), nadie, []), false);
});

test("un compañero vigila solo mientras una meta lo señala", () => {
  const valeria = persona("companero_1");
  assert.equal(esVigilante(valeria, nadie, []), false);
  assert.equal(esVigilante(valeria, new Set([valeria]), []), true);
});

test("una escena puede marcar a cualquiera con vigila_<nombre>", () => {
  assert.equal(esVigilante(persona("vecino_1"), nadie, ["vigila_vecino_1"]), true);
  assert.equal(esVigilante(persona("vecino_2"), nadie, ["vigila_vecino_1"]), false);
});
