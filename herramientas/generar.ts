// Asks Codex ($imagegen, with the owner's ChatGPT login) for each layer of the protagonist, editing
// every pose of the base body, and checks each result before keeping it
// Run: node herramientas/generar.ts <cuerpo> <capa> [<capa> ...]
//   cuerpo: cuerpo_nina (its poses are in ARTE/personaje/cuerpo_nina)
//   capa: a piece of the personaje group, e.g. cabello_01. Results go to ARTE/personaje/<cuerpo>/<capa>/.
// With --lista it only prints what is missing (reference to attach, where to save it, exact prompt),
// so it can also be made by hand with any image generator; the next run checks those files too.
// Then: node herramientas/acomodar.ts personaje/<capa> ARTE/personaje/<cuerpo>/<capa> ARTE/personaje/<cuerpo>
// Another body (node herramientas/generar.ts cuerpo_nina cuerpo_nino) goes to ARTE/personaje/cuerpo_nino; then
//   node herramientas/acomodar.ts personaje/cuerpo_nino ARTE/personaje/cuerpo_nino --igual-a ARTE/personaje/cuerpo_nina
// Figures of the house: node herramientas/generar.ts figuras [<id> ...] (all of FIGURAS in arte.ts without ids) draws
// each one from the protagonist's front pose, to ARTE/figuras/<id>.png, all in one folder; then
//   node herramientas/acomodar.ts figuras   (every figure found there)
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { ARTE, ASSETS, FIGURAS, ROOT, esProvisional, leerManifiesto, type Pieza } from "./arte.ts";

const A_LA_VEZ = 4; // Codex runs at once
const INTENTOS = 3;

const VERDE = "bright green with darker green shadows and lighter green highlights; nothing else in the image is green";

// What each layer adds, in the generator's language. `verde`: the game recolors it, so it is drawn green.
// `cabeza`: it sits on the head or the shoulders, which do not move while walking, so only the standing poses are
// asked for and every step reuses them exactly (acomodar.ts); hair never changes between frames.
// `cuerpo`: another body made from this one. Only the face changes, and the head of every step and of
// the back view is copied from the standing poses (acomodar.ts), so only the standing poses from the
// front and the side are asked for; the other poses are this body's own, copied as they are.
const CAPAS: Record<string, { que: string; verde?: boolean; cabeza?: boolean; cuerpo?: boolean }> = {
  cuerpo_nino: { que: "turn this girl into a boy of the same age. Change ONLY the face and the ears: a boy's face, no eyelashes, slightly thicker eyebrows. Keep the head exactly the same shape and size, still bald, the same light-gray fitted t-shirt and shorts, barefoot, and the exact same silhouette", cuerpo: true },
  cabello_01: { que: "long straight hair that falls past the shoulders to the middle of the back, center part", verde: true, cabeza: true },
  cabello_02: { que: "long curly hair that falls past the shoulders, full volume", verde: true, cabeza: true },
  cabello_03: { que: "two long braids, one on each side, falling over the shoulders, center part", verde: true, cabeza: true },
  cabello_04: { que: "two pigtails tied high on each side of the head, center part", verde: true, cabeza: true },
  cabello_05: { que: "a ponytail tied at the back of the head, hair pulled back from the face", verde: true, cabeza: true },
  cabello_06: { que: "short straight hair that covers the ears, simple side part", verde: true, cabeza: true },
  cabello_07: { que: "short curly hair close to the head", verde: true, cabeza: true },
  cabello_08: { que: "a very short buzz cut, a thin even layer of hair over the scalp", verde: true, cabeza: true },
  cabello_09: { que: "a round afro hairstyle, big and soft", verde: true, cabeza: true },
  cabello_10: { que: "shoulder-length straight hair with straight bangs over the forehead", verde: true, cabeza: true },
  ropa_uniforme_arriba: { que: "a plain royal-blue long-sleeve school sweater over a white polo shirt, the white polo collar showing at the neck. Only the upper body: the gray shorts, legs and bare feet stay exactly as they are" },
  ropa_uniforme_pantalon: { que: "navy-blue long school trousers covering both legs down to the ankles. Only the trousers: the gray t-shirt, arms and bare feet stay exactly as they are" },
  ropa_uniforme_falda: { que: "a navy-blue pleated school skirt down to the knees. Only the skirt: the gray t-shirt, arms, lower legs and bare feet stay exactly as they are" },
  ropa_casa_arriba: { que: "a plain dark-teal short-sleeve t-shirt. Only the t-shirt: the gray shorts, arms, legs and bare feet stay exactly as they are" },
  ropa_casa_abajo: { que: "dark-gray sweatpants covering both legs down to the ankles. Only the sweatpants: the t-shirt, arms and bare feet stay exactly as they are" },
  calzado_tenis: { que: "white sneakers with light-gray soles on both feet. Only the shoes: everything above the ankles stays exactly as it is" },
  extra_lentes: { que: "simple round dark-frame glasses", cabeza: true },
  extra_aretes: { que: "small round gold stud earrings", cabeza: true },
  extra_gorra: { que: "a plain red baseball cap worn forward", cabeza: true },
  extra_mochila: { que: "a school backpack worn on both shoulders, with its straps visible", verde: true, cabeza: true },
};

// Each pose of the base body, as the generator should read it.
const POSES: Record<string, string> = {
  abajo_quieta: "standing still, facing the viewer",
  abajo_paso: "walking toward the viewer, one leg stepping forward",
  izq_quieta: "standing still, facing the left side of the image in profile",
  izq_paso1: "walking toward the left side of the image in profile",
  izq_paso2: "walking toward the left side of the image in profile, the other leg in front",
  arriba_quieta: "standing still, seen from behind",
  arriba_paso: "walking away from the viewer, seen from behind, one leg stepping forward",
};

// A head layer already made from the front is attached too, so the other views draw the same thing.
const deFrente = (destino: string, pose: string, capa: string) => {
  const f = CAPAS[capa].cabeza && pose !== "abajo_quieta" && archivo(destino, "abajo_quieta");
  return f ? join(destino, f) : null;
};

const prompt = (pose: string, capa: string, conFrente = false) => {
  const c = CAPAS[capa];
  return [
    `The attached image is a pixel art game character ${POSES[pose]}, on a flat magenta background.`,
    conFrente ? "A second attached image shows the same character from the front already wearing this item: draw exactly the same item (same shape, length, volume and colors), only seen from this other side." : "",
    `Edit ${conFrente ? "the first attached image" : "it"}: ${c.cuerpo ? "" : "add "}${c.que}.`,
    c.verde ? `The ${capa.startsWith("cabello") ? "hair" : "backpack"} is ${VERDE}.` : "",
    capa.startsWith("cabello") && pose.startsWith("arriba")
      ? "The character is seen from BEHIND: we see the back of the head, not the face. The hair covers the whole back of the head, from the top down to the nape, with no bald or skin-colored area on the head; draw the hairstyle as it looks from behind (no bangs, no face)."
      : "",
    `Keep everything else identical: the same body, the same pose, the head in the same size and position on the canvas,${pose.startsWith("arriba") || c.cuerpo ? "" : " the same face,"} skin color, pixel size and dark outline.`,
    "Create ONE image the same size as the attached one, with ONLY ONE character. Flat solid magenta background (#FF00FF), fully opaque, never transparent. No text, no floor shadow, no extra objects.",
  ].filter(Boolean).join(" ");
};

// A figure of the house, drawn from the protagonist so it has the same style. The child in the reference is
// shrunk (baseFigura) so an adult fits above it; acomodar.ts cuts each figure to its height anyway.
const promptFigura = (id: string) => {
  const { que, alto } = FIGURAS[id];
  const veces = alto / 60;
  const tam = veces > 1.04 ? `taller than the child: about ${veces.toFixed(2)} times the child's height, with the head about the same size as the child's and a longer body` : veces < 0.96 ? `smaller than the child: about ${veces.toFixed(2)} times the child's height` : "about as tall as the child";
  return [
    "The attached image is a pixel art game character, a child of about 9, standing still and facing the viewer, on a flat magenta background.",
    "Draw a NEW character in exactly the same art style: the same pixel size, the same dark outline, the same flat colors with soft shading, the same chibi proportions, the same kind of face and eyes, and the same skin color.",
    `The new character: ${que}. Standing still, facing the viewer, arms relaxed at the sides, full body from head to feet. It is ${tam}, standing on the same floor line as the child.`,
    "Plain everyday Mexican clothes; no beige, brown, orange or pink clothes or shoes, so they never look like skin. Hair in its real color.",
    "Do NOT draw the child: create ONE image the same size as the attached one, with ONLY the new character, centered. Flat solid magenta background (#FF00FF), fully opaque, never transparent. No text, no floor shadow, no extra objects.",
  ].filter(Boolean).join(" ");
};

// The front pose of the body, shrunk to 70% with its feet on the same line, so a taller figure fits above it.
async function baseFigura(cuerpo: string) {
  const dir = join(ARTE, "figuras", "_base");
  const destino = join(dir, `${cuerpo}.png`);
  if (existsSync(destino)) return destino;
  mkdirSync(dir, { recursive: true });
  const origen = join(ARTE, "personaje", cuerpo);
  const im = await loadImage(join(origen, archivo(origen, "abajo_quieta")!));
  const L = Math.max(im.width, 1600); // a small drawing is enlarged with sharp pixels
  const c = createCanvas(L, L), ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(0, 0, L, L);
  ctx.drawImage(im, L * 0.15, L * 0.28, L * 0.7, L * 0.7);
  writeFileSync(destino, c.toBuffer("image/png"));
  return destino;
}

// A figure is kept if it has the reference's shape, there is one figure and nothing touches the edge.
async function revisarFigura(base: string, hecho: string): Promise<string | null> {
  const [ia, ib] = [await loadImage(base), await loadImage(hecho)];
  if (ia.width * ib.height !== ia.height * ib.width) return `mide ${ib.width} × ${ib.height} y debe ser cuadrada como la imagen que se sube`;
  const c = createCanvas(400, 400);
  c.getContext("2d").drawImage(ib, 0, 0, 400, 400);
  const d = c.getContext("2d").getImageData(0, 0, 400, 400).data;
  let n = 0, orilla = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.hypot(d[i] - 255, d[i + 1], d[i + 2] - 255) <= 115) continue;
    n++;
    const x = (i / 4) % 400, y = (i / 1600) | 0;
    if (x < 2 || y < 2 || x > 397 || y > 397) orilla++;
  }
  if (n < 2000) return "no hay figura";
  if (orilla > 20) return "la figura toca la orilla de la imagen";
  return null;
}

const archivo = (carpeta: string, n: string) => readdirSync(carpeta).find((a) => a.replace(/\.(png|jpe?g|webp)$/, "") === n);

// The edit is kept only if the body stayed where it was: most of the base figure is still figure in
// the edit, and the head did not move. Green layers must show green; hair must cover the top of the
// head (from behind, the whole head).
async function revisar(base: string, hecho: string, capa: string, pose: string): Promise<string | null> {
  const datos = async (r: string) => {
    const im = await loadImage(r);
    const c = createCanvas(400, 400);
    c.getContext("2d").drawImage(im, 0, 0, 400, 400);
    return c.getContext("2d").getImageData(0, 0, 400, 400).data;
  };
  const [ia, ib] = [await loadImage(base), await loadImage(hecho)];
  // A smaller copy is fine (it is scaled up when cut); only the shape must match.
  if (ia.width * ib.height !== ia.height * ib.width) return `mide ${ib.width} × ${ib.height} y debe ser cuadrada como la imagen que se sube`;
  const [a, b] = [await datos(base), await datos(hecho)];
  const fig = (d: Uint8ClampedArray, i: number) => Math.hypot(d[i] - 255, d[i + 1], d[i + 2] - 255) > 115;
  const verde = (d: Uint8ClampedArray, i: number) => fig(d, i) && d[i + 1] > 60 && d[i + 1] > d[i] * 1.3 && d[i + 1] > d[i + 2] * 1.3;
  let enBase = 0, siguen = 0, verdes = 0, arriba = 400, abajo = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (fig(a, i)) { enBase++; if (fig(b, i)) siguen++; const y = i / 1600 | 0; arriba = Math.min(arriba, y); abajo = Math.max(abajo, y); }
    if (verde(b, i)) verdes++;
  }
  if (siguen / enBase < 0.85) return `el cuerpo se movió (${Math.round((siguen / enBase) * 100)}% en su lugar)`;
  // Another body must keep the silhouette, or the hair and clothes made for this one would not fit it.
  // Compared with both figures lined up by their top-left corner (a drawing done by hand may be shifted).
  if (CAPAS[capa].cuerpo) {
    const caja = (d: Uint8ClampedArray) => {
      let x0 = 400, y0 = 400;
      for (let i = 0; i < d.length; i += 4) if (fig(d, i)) { x0 = Math.min(x0, (i / 4) % 400); y0 = Math.min(y0, i / 1600 | 0); }
      return [x0, y0];
    };
    const [[ax, ay], [bx, by]] = [caja(a), caja(b)];
    let union = 0, distinto = 0;
    for (let y = 0; y < 400; y++)
      for (let x = 0; x < 400; x++) {
        const X = x - ax + bx, Y = y - ay + by;
        const ea = fig(a, (y * 400 + x) * 4), eb = X >= 0 && Y >= 0 && X < 400 && Y < 400 && fig(b, (Y * 400 + X) * 4);
        if (ea || eb) union++;
        if (ea !== eb) distinto++;
      }
    if (distinto / union > 0.06) return `la silueta cambió (${Math.round((1 - distinto / union) * 100)}% igual; debe ser 94% o más)`;
  }
  if (CAPAS[capa].verde && verdes < 300) return "no salió verde";
  if (capa.startsWith("cabello")) {
    const H = abajo - arriba;
    let x0 = 400, x1 = 0;
    for (let i = 0; i < a.length; i += 4) {
      const y = i / 1600 | 0, x = (i / 4) % 400;
      if (y < arriba + H * 0.2 && fig(a, i)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    }
    // From behind, the middle of the head must be all hair (the generator tends to leave a bald,
    // face-shaped patch there); from the front or side, the top of the head.
    const atras = pose.startsWith("arriba");
    const [ya, yb, xa, xb] = atras
      ? [arriba + H * 0.05, arriba + H * 0.28, x0 + (x1 - x0) * 0.3, x1 - (x1 - x0) * 0.3]
      : [arriba, arriba + H * 0.15, 0, 400];
    let cabeza = 0, cubierta = 0;
    for (let i = 0; i < a.length; i += 4) {
      const y = i / 1600 | 0, x = (i / 4) % 400;
      if (y < ya || y > yb || x < xa || x > xb || (!atras && !fig(a, i))) continue;
      cabeza++;
      if (verde(b, i)) cubierta++;
    }
    if (cubierta / cabeza < (atras ? 0.85 : 0.45)) return `el cabello no cubre la cabeza (${Math.round((cubierta / cabeza) * 100)}%)`;
  }
  return null;
}

// Runs Codex once. Returns when Codex may be used again if the plan's usage limit was hit.
function codex(dir: string, entradas: string[], texto: string): Promise<Date | null> {
  return new Promise((ok) => {
    const p = spawn("timeout", ["900", "codex", "exec", "--skip-git-repo-check", "-m", "gpt-5.6-terra", "-c", 'model_reasoning_effort="low"',
      "-s", "workspace-write", "-C", dir, ...entradas.flatMap((e) => ["-i", e]), "--", `$imagegen ${texto} Save the result as salida.png in the current folder.`], { stdio: ["ignore", "pipe", "pipe"] });
    let salida = "";
    p.stdout.on("data", (d) => (salida += d));
    p.stderr.on("data", (d) => (salida += d));
    p.on("exit", (code, signal) => {
      const m = /usage limit.*?try again at (\d+):(\d+) ?([AP]M)/is.exec(salida);
      if (!/usage limit/i.test(salida)) {
        if (code !== 0) console.error(`codex terminó con ${code ?? signal}: ${salida.slice(-3000)}`);
        return ok(null);
      }
      const t = new Date();
      if (m) {
        t.setHours((+m[1] % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0), +m[2] + 1, 0, 0);
        if (t < new Date()) t.setDate(t.getDate() + 1);
      } else t.setMinutes(t.getMinutes() + 30);
      ok(t);
    });
  });
}

// When the plan's limit is hit, every worker waits until Codex can be used again.
let pausa: Promise<void> | null = null;
function esperar(hasta: Date) {
  pausa ??= new Promise<void>((ok) => {
    console.log(`límite de uso de Codex: sigue a las ${hasta.toLocaleTimeString()}`);
    setTimeout(() => { pausa = null; ok(); }, hasta.getTime() - Date.now());
  });
  return pausa;
}

function referenciasDe(pieza: Pieza) {
  const g = pieza.generacion;
  if (!g || !g.prompt.trim() || !g.referencias.length || !g.destino) throw new Error(`${pieza.id}: faltan prompt, referencias o destino`);
  if (isAbsolute(g.destino) || resolve(ARTE, g.destino).startsWith(`${resolve(ARTE)}${sep}`) === false)
    throw new Error(`${pieza.id}: destino fuera de ARTE: ${g.destino}`);
  return g.referencias.map((r) => {
    if (isAbsolute(r) || resolve(ARTE, r).startsWith(`${resolve(ARTE)}${sep}`) === false)
      throw new Error(`${pieza.id}: referencia fuera de ARTE: ${r}`);
    const f = join(ARTE, r);
    if (!existsSync(f)) throw new Error(`${pieza.id}: no existe la referencia ${f}`);
    return f;
  });
}

async function revisarPieza(pieza: Pieza, salida: string, referencias: string[]): Promise<string | null> {
  let imagen;
  try { imagen = await loadImage(salida); } catch { return "el resultado no es una imagen legible"; }
  const referencia = await loadImage(referencias[0]);
  const esperado = pieza.tipo === "fondo" ? pieza.medida[0] / pieza.medida[1] : referencia.width / referencia.height;
  const real = imagen.width / imagen.height;
  if (Math.abs(real - esperado) / esperado > 0.035) return `proporción ${imagen.width} × ${imagen.height}; se esperaba ${esperado.toFixed(3)}`;
  if (pieza.tipo !== "fondo") {
    const c = createCanvas(4, 4), ctx = c.getContext("2d");
    ctx.drawImage(imagen, 0, 0, 4, 4);
    const d = ctx.getImageData(0, 0, 4, 4).data;
    for (const i of [0, 12, 48, 60]) {
      if (d[i + 3] < 250 || Math.hypot(d[i] - 255, d[i + 1], d[i + 2] - 255) > 125)
        return "el fondo no es magenta opaco en las esquinas";
    }
  }
  return null;
}

async function unaPieza(pieza: Pieza, referencias: string[], destino: string) {
  for (let intento = 1; intento <= INTENTOS; intento++) {
    if (pausa) await pausa;
    if (existsSync(destino)) return console.log(`${pieza.id}: existe, no se reemplaza`);
    const dir = mkdtempSync(join(tmpdir(), "matices-arte-"));
    const limite = await codex(dir, referencias, pieza.generacion!.prompt);
    if (limite) { rmSync(dir, { recursive: true }); await esperar(limite); intento--; continue; }
    const salida = join(dir, "salida.png");
    const mal = !existsSync(salida) ? "no generó imagen" : await revisarPieza(pieza, salida, referencias);
    if (!mal) {
      mkdirSync(join(destino, ".."), { recursive: true });
      copyFileSync(salida, destino);
      rmSync(dir, { recursive: true });
      return console.log(`${pieza.id}: lista`);
    }
    console.log(`${pieza.id}: ${mal}, intento ${intento}`);
    rmSync(dir, { recursive: true });
  }
  return console.log(`${pieza.id}: FALLÓ después de ${INTENTOS} intentos`);
}

async function artePendiente(ids: string[], lista: boolean) {
  const piezas = leerManifiesto().piezas.filter((p) => p.generacion && (!ids.length || ids.includes(p.id))).sort((a, b) => a.generacion!.orden - b.generacion!.orden);
  if (ids.some((id) => !piezas.some((p) => p.id === id))) throw new Error(`no hay arte de generación para: ${ids.filter((id) => !piezas.some((p) => p.id === id)).join(", ")}`);
  if (!piezas.length) throw new Error("el manifiesto no tiene imágenes pendientes configuradas");
  const trabajos = piezas.map((pieza) => ({ pieza, referencias: referenciasDe(pieza), destino: join(ARTE, pieza.generacion!.destino) }));
  if (lista) {
    for (const { pieza, referencias, destino } of trabajos) {
      console.log(["", `## ${pieza.id}`, `- Adjuntar: ${referencias.join(", ")}`, `- Guardar como: ${destino}`, `- Después: ${pieza.generacion!.despues}`, "", "```", pieza.generacion!.prompt, "```"].join("\n"));
    }
    return;
  }
  const cola = trabajos.filter((t) => !existsSync(t.destino));
  for (const t of trabajos) if (existsSync(t.destino)) console.log(`${t.pieza.id}: existe, se omite`);
  await Promise.all(Array.from({ length: A_LA_VEZ }, async () => {
    for (let t; (t = cola.shift()); ) await unaPieza(t.pieza, t.referencias, t.destino);
  }));
  for (const { pieza, destino } of trabajos) {
    if (pieza.generacion!.despues !== "acomodar" || !existsSync(destino)) continue;
    const asset = join(ASSETS, pieza.archivo);
    if (existsSync(asset) && !esProvisional(pieza.archivo)) {
      console.log(`${pieza.id}: arte del juego existente, no se reemplaza`);
      continue;
    }
    const dir = relative(ARTE, destino).replace(/\/[^/]+$/, "");
    const r = spawnSync(process.execPath, [join(ROOT, "herramientas/acomodar.ts"), pieza.id, join(ARTE, dir)], { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) console.error(`${pieza.id}: no se pudo acomodar en el juego (código ${r.status})`);
  }
  const fallidas = trabajos.filter(({ pieza, destino }) => {
    if (!existsSync(destino)) return true;
    if (pieza.generacion!.despues !== "acomodar") return false;
    const asset = join(ASSETS, pieza.archivo);
    return !existsSync(asset) || esProvisional(pieza.archivo);
  });
  console.log(`Resumen: ${trabajos.length - fallidas.length}/${trabajos.length} listas; ${fallidas.length} pendientes.`);
  for (const { pieza } of fallidas) console.log(`Pendiente: ${pieza.id}`);
}

async function una(base: string, destino: string, pose: string, capa: string) {
  const fig = !!FIGURAS[capa] && !CAPAS[capa];
  const entrada = fig ? base : join(base, archivo(base, pose)!);
  for (let i = 1; i <= INTENTOS; i++) {
    if (pausa) await pausa;
    if (archivo(destino, pose)) return console.log(`${capa}/${pose}: ya está (hecha a mano)`);
    const dir = mkdtempSync(join(tmpdir(), "matices-"));
    const frente = fig ? null : deFrente(destino, pose, capa);
    const limite = await codex(dir, frente ? [entrada, frente] : [entrada], fig ? promptFigura(capa) : prompt(pose, capa, !!frente));
    if (limite) { rmSync(dir, { recursive: true }); await esperar(limite); i--; continue; } // not a failed attempt
    const salida = join(dir, "salida.png");
    const mal = !existsSync(salida) ? "no generó imagen" : fig ? await revisarFigura(entrada, salida) : await revisar(entrada, salida, capa, pose);
    if (!mal) {
      copyFileSync(salida, join(destino, `${pose}.png`));
      rmSync(dir, { recursive: true });
      return console.log(`${capa}/${pose}: listo (intento ${i})`);
    }
    console.log(`${capa}/${pose}: ${mal}, intento ${i}`);
    rmSync(dir, { recursive: true });
  }
  console.log(`${capa}/${pose}: FALLÓ`);
}

async function main() {
  const lista = process.argv.includes("--lista");
  const [cuerpo, ...capas] = process.argv.slice(2).filter((a) => a !== "--lista");
  if (cuerpo === "arte") return void (await artePendiente(capas, lista));
  const cola: (() => Promise<void>)[] = [];
  const correr = () => Promise.all(Array.from({ length: A_LA_VEZ }, async () => { for (let t; (t = cola.shift()); ) await t(); }));
  if (cuerpo === "figuras") {
    const carpeta = join(ARTE, "figuras");
    mkdirSync(carpeta, { recursive: true });
    for (const id of capas.length ? capas : Object.keys(FIGURAS)) {
      if (!FIGURAS[id]) throw new Error(`no hay instrucciones para la figura ${id}`);
      const base = await baseFigura(FIGURAS[id].base);
      const hecho = archivo(carpeta, id) ?? archivo(carpeta, `${id}_quieta`);
      const mal = hecho && (await revisarFigura(base, join(carpeta, hecho)));
      if (mal) console.log(lista ? `\n> ${id}: ${mal}` : `${id}: ${mal}, se pide de nuevo`);
      if (mal && !lista) rmSync(join(carpeta, hecho));
      if (hecho && !mal) continue;
      if (lista) console.log(`\n## ${id} · quieta\n- Adjuntar: ${base}\n- Guardar como: ${join(carpeta, id + ".png")}\n\n\`\`\`\n${promptFigura(id)}\n\`\`\``);
      else cola.push(() => una(base, carpeta, id, id));
    }
    return void (await correr());
  }
  const base = join(ARTE, "personaje", cuerpo);
  if (!cuerpo || !capas.length || !existsSync(base)) throw new Error("uso: node herramientas/generar.ts <cuerpo> <capa> [<capa> ...] | figuras [<id> ...]");
  for (const capa of capas) {
    if (!CAPAS[capa]) throw new Error(`no hay instrucciones para ${capa}`);
    // Another body lives next to this one (ARTE/personaje/cuerpo_nino), a layer inside it.
    const destino = CAPAS[capa].cuerpo ? join(ARTE, "personaje", capa) : join(base, capa);
    mkdirSync(destino, { recursive: true });
    for (const pose of Object.keys(POSES)) {
      if (CAPAS[capa].cabeza && !pose.endsWith("quieta")) continue;
      if (CAPAS[capa].cuerpo && !["abajo_quieta", "izq_quieta"].includes(pose)) {
        if (!archivo(destino, pose)) copyFileSync(join(base, archivo(base, pose)!), join(destino, archivo(base, pose)!));
        continue;
      }
      const hecho = archivo(destino, pose);
      // What is already there passes the same check again; a failure is asked for again.
      const mal = hecho && (await revisar(join(base, archivo(base, pose)!), join(destino, hecho), capa, pose));
      // With --lista nothing is deleted: it only says what is wrong.
      if (mal) console.log(lista ? `\n> ${capa}/${pose}: ${mal}` : `${capa}/${pose}: ${mal}, se pide de nuevo`);
      if (mal && !lista) rmSync(join(destino, hecho));
      if (!(!hecho || mal)) continue;
      const frente = deFrente(destino, pose, capa);
      if (lista) console.log(`\n## ${capa} · ${pose}\n- Adjuntar: ${join(base, archivo(base, pose)!)}${frente ? `\n- Adjuntar también (segunda imagen): ${frente}` : ""}\n- Guardar como: ${join(destino, pose + ".png")}\n\n\`\`\`\n${prompt(pose, capa, !!frente)}\n\`\`\``);
      else cola.push(() => una(base, destino, pose, capa));
    }
  }
  await correr();
}

await main();
