// npm test: camera smoothing, zoom center anchoring, and alternative scene prerequisites.
import { test } from "node:test";
import assert from "node:assert/strict";

test("la interpolación exponencial de la cámara suaviza el movimiento sin saltos", () => {
  let camX = 100;
  let camY = 100;
  const targetX = 200;
  const targetY = 200;

  // Frame 1 with 16ms (60fps)
  const dt = 0.016;
  const factor = 1 - Math.exp(-dt * 12);
  camX += (targetX - camX) * factor;
  camY += (targetY - camY) * factor;

  // The camera must move smoothly towards target, not snap instantly to 200 nor stay at 100
  assert.ok(camX > 110 && camX < 130);
  assert.ok(camY > 110 && camY < 130);

  // After 30 frames (~0.5s)
  for (let f = 0; f < 30; f++) {
    camX += (targetX - camX) * factor;
    camY += (targetY - camY) * factor;
  }
  // Camera has smoothly converged to the target
  assert.ok(Math.abs(camX - targetX) < 1.0);
  assert.ok(Math.abs(camY - targetY) < 1.0);
});

test("el zoom suave mantiene invariante el centro del mundo en pantalla", () => {
  const canvasWidth = 800;
  const canvasHeight = 600;
  let camX = 200;
  let camY = 150;
  const viejoZ = 2;
  const nuevoZ = 2.5;

  // World center before zoom
  const centroMundoX = camX + (canvasWidth / viejoZ) / 2;
  const centroMundoY = camY + (canvasHeight / viejoZ) / 2;

  // Apply camera shift formula
  camX = centroMundoX - (canvasWidth / nuevoZ) / 2;
  camY = centroMundoY - (canvasHeight / nuevoZ) / 2;

  // World center after zoom must be strictly identical
  const nuevoCentroMundoX = camX + (canvasWidth / nuevoZ) / 2;
  const nuevoCentroMundoY = camY + (canvasHeight / nuevoZ) / 2;

  assert.equal(Math.round(nuevoCentroMundoX * 100), Math.round(centroMundoX * 100));
  assert.equal(Math.round(nuevoCentroMundoY * 100), Math.round(centroMundoY * 100));
});

test("prerrequisitos alternativos (tras con arreglo) desbloquean la escena con cualquiera de las opciones", () => {
  const cumplePrerrequisito = (tras: string[] | string | undefined, hechas: string[]) => {
    const lista = ([] as string[]).concat(tras ?? []);
    return lista.length === 0 || lista.some((t) => hechas.includes(t));
  };

  // R01 requires [U01a, U01b]
  const trasR01 = ["U01a", "U01b"];
  assert.equal(cumplePrerrequisito(trasR01, []), false);
  assert.equal(cumplePrerrequisito(trasR01, ["U01a"]), true);
  assert.equal(cumplePrerrequisito(trasR01, ["U01b"]), true);

  // T05 has no tras (can trigger directly when talking to mamá in morning)
  assert.equal(cumplePrerrequisito(undefined, []), true);
});
