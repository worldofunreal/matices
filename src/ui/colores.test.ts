// npm test: the parchment look is owned by estilos.css. Other stylesheets may not write a white or a cream
// by hand for a background or a border; a line that must stay white says so with "a propósito".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const DUENO = join("ui", "estilos.css");
const BLANCO_O_CREMA = /#fff(?:fff)?\b|#(?:fdfaf6|fefaf3|fbf6ee|fffdf8|fff9e6)\b|rgba?\(\s*25[345][ ,]+25[0-5][ ,]+2[345]\d/i;

test("las hojas de estilo no escriben blanco ni crema a mano para fondos y bordes", () => {
  const hallazgos: string[] = [];
  const revisadas: string[] = [];
  for (const archivo of readdirSync(SRC, { recursive: true, encoding: "utf8" })) {
    if (!archivo.endsWith(".css") || archivo === DUENO) continue;
    revisadas.push(archivo);
    readFileSync(join(SRC, archivo), "utf8").split("\n").forEach((linea, i) => {
      if (/\b(background|border)/.test(linea) && BLANCO_O_CREMA.test(linea) && !linea.includes("a propósito")) {
        hallazgos.push(`${archivo}:${i + 1}`);
      }
    });
  }
  assert.ok(revisadas.length > 0, "no encontró hojas de estilo");
  assert.deepEqual(hallazgos, []);
});
