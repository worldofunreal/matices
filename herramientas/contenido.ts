// Loads contenido/*.yaml and public/assets/manifiesto.yaml, validates them and exposes them as
// `virtual:contenido` and `virtual:arte`. Any error stops the build: content without a valid code
// and art with a missing file or a wrong size never ship.
// Sources of truth: codes in contenido/codigos.md, area ids in
// contenido/areas.md, version in contenido/README.md, art in public/assets/manifiesto.yaml.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Plugin } from "vite";
import { ROOT, MANIFIESTO, DOC_CODIGOS, codigosValidos, leerManifiesto, medidaPng, RAMPAS, FIGURAS } from "./arte.ts";

const DIR = join(ROOT, "contenido");
const DOC_AREAS = join(ROOT, "contenido/areas.md");
const README = join(DIR, "README.md");

const MODULOS: Record<string, () => unknown> = { "virtual:contenido": validar, "virtual:arte": validarArte };

// What each minigame leaves behind: the marks it sets in the child's story. Scenes can ask for them (si, no).
const MINIJUEGOS: Record<string, string[]> = { refri: [], estufa: [], ropero: ["ropa_uniforme", "ropa_deporte", "ropa_casual"], cuerda: [], dibujo: [], pistas: [], examen: [], tienda: [] };
// The effects a scene can set on screen, as the story asks for them (src/pantallas/escena.css); Opciones scales them.
const EFECTOS = new Set(["inquietud", "miedo", "intensidad", "acompanamiento", "alegria"]);
const HORAS = new Set(["manana", "tarde", "noche"]);
const DIAS = 3; // as in src/datos/dia.ts

// The areas, from the table in contenido/areas.md (the only place they are written).
function areasDelMarco(): { id: string; nombre: string; familia: string }[] {
  const doc = readFileSync(DOC_AREAS, "utf8");
  return [...doc.matchAll(/^\| ([^|]+?) \| ([^|]+?) \| `([a-z_]+)` \|/gm)].map((m) => ({ familia: m[1], nombre: m[2], id: m[3] }));
}
const areasValidas = () => new Set(areasDelMarco().map((a) => a.id));

function version(): string {
  const m = readFileSync(README, "utf8").match(/Versión del contenido: `([0-9.]+)`/);
  if (!m) throw new Error("contenido/README.md no dice la versión del contenido");
  return m[1];
}

// Words that change with gender. The same lines are shown to every child, and who reacts can be anyone
// of the house, so no text carries a gender.
const CON_GENERO = /(^|[«"¡¿ ])(?:lo|la) (?=levanta|lleva|regaña|saca|abraza|felicita|jala|ve |manda|llevan|castiga)|\b(soy (?:un|una)|enojad[oa]s?|cansad[oa]s?|sentad[oa]s?|asustad[oa]s?|preocupad[oa]s?|nervios[oa]s?|content[oa]s?)\b/i;

export function validar() {
  const codigos = codigosValidos();
  const areas = areasValidas();
  const errores: string[] = [];
  const err = (donde: string, msg: string) => errores.push(`${donde}: ${msg}`);

  // The gender mark {o} is the only one allowed in a line: "list{o}" is "listo" or "lista" by the child's body.
  const texto = (donde: string, t: unknown) => {
    if (typeof t !== "string" || !t.trim()) return err(donde, "texto vacío");
    const genero = t.match(CON_GENERO);
    if (genero) err(donde, `"${genero[0]}" cambia con el género; se escribe con la marca {o} ("list{o}")`);
    for (const m of t.match(/\{[^}]*\}/g) ?? []) if (m !== "{o}") err(donde, `marca desconocida ${m}`);
  };
  const codigo = (donde: string, c: unknown) => {
    if (typeof c !== "string" || !codigos.has(c)) err(donde, `código inexistente ${String(c)}`);
  };
  const area = (donde: string, a: unknown) => {
    if (typeof a !== "string" || !areas.has(a)) err(donde, `área inexistente ${String(a)}`);
  };

  const textos = parse(readFileSync(join(DIR, "textos.yaml"), "utf8"));
  const marcasTextos = new Set(["{nombre}", "{n}", "{paso}"]);
  const recorrer = (v: unknown, donde: string): void => {
    if (typeof v === "string") {
      if (!v.trim()) err(donde, "texto vacío");
      for (const m of v.match(/\{[^}]*\}/g) ?? []) if (!marcasTextos.has(m)) err(donde, `marca desconocida ${m}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => recorrer(x, `${donde}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) recorrer(x, `${donde}.${k}`);
  };
  recorrer(textos, "textos");
  const nombres: string[] = textos.creacion?.nombres ?? [];
  if (nombres.length !== 40 || new Set(nombres).size !== 40) err("textos creacion.nombres", "deben ser 40 nombres distintos");
  for (const k of ["cuerpo", "piel", "cabello", "color_cabello", "ropa", "extras", "color_mochila", "nombre"])
    if (!textos.creacion?.pasos?.[k]) err("textos creacion.pasos", `falta ${k}`);
  // Every garment that changes color needs the name of its row of colors.
  for (const p of leerManifiesto().piezas)
    if (/^personaje\/(ropa_|calzado_)/.test(p.id) && !textos.creacion?.color_de?.[p.id.split("/")[1]]) err("textos creacion.color_de", `falta ${p.id.split("/")[1]}`);

  // Family figures: each one needs its figure and its art (FIGURAS).
  const { figuras: listaFiguras } = parse(readFileSync(join(DIR, "figuras.yaml"), "utf8")) as { figuras: [string, string, string][] };
  const manifiesto = leerManifiesto();
  const piezas = new Set(manifiesto.piezas.map((p) => p.id));
  const figuras = listaFiguras.map(([id, tipo, nombre]) => {
    if (tipo !== "adulto") err(`figuras ${id}`, `tipo inválido ${tipo}`);
    if (!piezas.has(`figuras/${id}`)) err(`figuras ${id}`, `falta figuras/${id} en el manifiesto`);
    if (!FIGURAS[id]) err(`figuras ${id}`, "falta en FIGURAS (herramientas/arte.ts)");
    if (FIGURAS[id] && FIGURAS[id].alto > (manifiesto.piezas.find((p) => p.id === `figuras/${id}`)?.medida[1] ?? 0) - 2) err(`figuras ${id}`, "no cabe en su cuadro");
    texto(`figuras ${id}`, nombre);
    return { id, tipo, nombre };
  });

  // Maps: one per place with art (lugares/<lugar>/fondo); doors lead to a place and an arrival point
  // that exist; every person and object has its art and its phrase.
  const lugares = [...piezas].filter((id) => /^lugares\/[^/]+\/fondo$/.test(id)).map((id) => id.split("/")[1]);
  const mapas = Object.fromEntries(lugares.map((l) => [l, leerMapa(l)]));
  const mundo = textos.mundo ?? {};
  for (const [lugar, mapa] of Object.entries(mapas)) {
    if (!mapa) {
      err(`mapas/${lugar}.json`, "falta el mapa");
      continue;
    }
    const d = `mapas/${lugar}.json`;
    if (mapa.width * 32 !== medidaDe(`lugares/${lugar}/fondo`)[0] || mapa.height * 32 !== medidaDe(`lugares/${lugar}/fondo`)[1]) err(d, "no mide lo mismo que su fondo");
    for (const o of objetosDe(mapa)) {
      const p = propiedades(o);
      for (const h of (p.horas ?? "").split(",").filter(Boolean)) if (!HORAS.has(h)) err(`${d} ${o.name}`, `hora inválida ${h}`);
      if (o.type === "puerta") {
        const destino = mapas[p.destino];
        if (!destino) err(`${d} ${o.name}`, `lleva a un lugar que no existe: ${p.destino}`);
        else if (!objetosDe(destino).some((x) => x.type === "llegada" && x.name === p.llegada)) err(`${d} ${o.name}`, `no hay llegada ${p.llegada} en ${p.destino}`);
      }
      if (o.type === "npc") {
        if (!piezas.has(`personajes/${o.name}`)) err(`${d} ${o.name}`, "no hay arte de este personaje");
        if (!mundo.saludos?.[o.name]?.length) err(`${d} ${o.name}`, "no tiene saludos en textos.yaml");
        if (!mundo.nombres?.[o.name]) err(`${d} ${o.name}`, "no tiene nombre en textos.yaml (mundo.nombres)");
      }
      if (o.type === "objeto") {
        const arte = p.arte ?? `lugares/${lugar}/${o.name}`;
        if (!piezas.has(arte)) err(`${d} ${o.name}`, `no existe el arte ${arte}`);
        if (!mundo.objetos?.[lugar]?.[o.name] && !mundo.objetos?.comun?.[o.name]) err(`${d} ${o.name}`, "no tiene frase en textos.yaml");
      }
    }
  }

  // Everything in a map must be reachable on foot from where the child arrives: doors, zones,
  // objects and people (a walled-in court once made a story impossible to reach).
  for (const [lugar, mapa] of Object.entries(mapas)) {
    if (!mapa) continue;
    const muros = mapa.layers.find((l) => l.name === "muros") as unknown as { data: number[] } | undefined;
    if (!muros) continue;
    const W = mapa.width;
    const H = mapa.height;
    const libre = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !muros.data[y * W + x];
    const llegadas = objetosDe(mapa).filter((o) => o.type === "llegada" || o.name === "inicio") as (ObjetoMapa & { x: number; y: number })[];
    const visto = new Set<number>();
    const cola = llegadas.map((o) => [Math.floor(o.x / 32), Math.floor((o.y - 1) / 32)]).filter(([x, y]) => libre(x, y));
    for (const [x, y] of cola) visto.add(y * W + x);
    while (cola.length) {
      const [x, y] = cola.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (libre(nx, ny) && !visto.has(ny * W + nx)) {
          visto.add(ny * W + nx);
          cola.push([nx, ny]);
        }
      }
    }
    const alcanza = (x0: number, y0: number, w: number, h: number) => {
      for (let y = Math.floor(y0 / 32) - 1; y <= Math.floor((y0 + Math.max(h, 1) - 1) / 32) + 1; y++)
        for (let x = Math.floor(x0 / 32) - 1; x <= Math.floor((x0 + Math.max(w, 1) - 1) / 32) + 1; x++) if (visto.has(y * W + x)) return true;
      return false;
    };
    const capas = mapa.layers.filter((l) => ["objetos", "zonas", "cuartos"].includes(l.name)).flatMap((l) => l.objects ?? []) as (ObjetoMapa & { x: number; y: number; width: number; height: number })[];
    for (const o of capas) {
      const y = o.width ? o.y : o.y - 1;
      if (!alcanza(o.x, y, o.width, o.height)) err(`mapas/${lugar}.json ${o.name}`, "no se puede llegar caminando");
    }
  }

  // Scenes (contenido/escenas.yaml): where and when each one starts, its lines and its options. A delicate
  // scene must be skippable, so the child is never held in one; the validator refuses it otherwise.
  const hablantes = new Set(Object.keys(textos.escena?.hablantes ?? {}));
  const { escenas } = parse(readFileSync(join(DIR, "escenas.yaml"), "utf8")) as { escenas: Escena[] };
  const ids = new Set<string>();
  const marcasDelJuego = new Set([...escenas.flatMap((x) => x.pasos.flatMap((p) => (p.marca ? [p.marca] : []))), ...Object.values(MINIJUEGOS).flat()]);
  for (const x of escenas) {
    const d = `escenas ${x.id}`;
    if (!/^[A-Za-z0-9-]+$/.test(x.id) || ids.has(x.id)) err(d, "id repetido o inválido");
    ids.add(x.id);
    texto(`${d} nombre`, x.nombre);
    if (!mapas[x.donde]) err(d, `donde: ${x.donde} no es un mapa`);
    if (x.al.startsWith("salir:")) {
      if (!mapas[x.al.slice("salir:".length)]) err(d, `al: ${x.al} lleva a un lugar que no existe`);
    } else if (x.al !== "entrar") {
      const m = mapas[x.donde];
      if (m && !objetosDe(m).some((o) => (o.type === "objeto" || o.type === "npc") && o.name === x.al)) err(d, `al: ${x.al} no es un objeto ni una persona de ${x.donde}`);
    }
    if (x.dia !== undefined && !(Number.isInteger(x.dia) && x.dia >= 1 && x.dia <= DIAS)) err(d, `dia debe ser de 1 a ${DIAS}`);
    if (x.hora !== undefined && !HORAS.has(x.hora)) err(d, `hora inválida ${x.hora}`);
    for (const t of ([] as string[]).concat(x.tras ?? [])) if (!escenas.some((y) => y.id === t)) err(d, `tras: ${t} no es una escena`);
    for (const m of [...(x.si ?? []), ...(x.no ?? [])]) if (!marcasDelJuego.has(m)) err(d, `la marca ${m} nunca se da`);
    (x.areas ?? []).forEach((a) => area(`${d} areas`, a));
    if (x.delicada && !x.saltable) err(d, "una escena delicada debe ser saltable: pausar, saltar y pedir ayuda siempre a la mano");
    if (!x.pasos?.length) err(d, "sin pasos");
    let ultimo: string | null = null; // who spoke last: the answer to an option comes from them
    x.pasos.forEach((p, i) => {
      const dp = `${d} paso ${i + 1}`;
      const clases = ["de", "opciones", "marca", "mision", "minijuego", "efecto"].filter((k) => k in p);
      if (clases.length !== 1) return err(dp, "cada paso es una sola cosa: de, opciones, marca, mision, minijuego o efecto");
      if (p.de !== undefined) {
        if (!hablantes.has(p.de)) err(dp, `no se sabe quién habla: ${p.de}`);
        texto(dp, p.texto);
        ultimo = p.de;
      } else if (p.opciones) {
        if (p.opciones.length < 2 || p.opciones.length > 4) err(dp, "de 2 a 4 opciones");
        if (!ultimo) err(dp, "las opciones necesitan una línea antes");
        p.opciones.forEach((o, j) => {
          if (!Array.isArray(o) || o.length !== 3) return err(`${dp} opción ${j + 1}`, "debe ser [CÓDIGO, texto, respuesta]");
          codigo(`${dp} opción ${j + 1}`, o[0]);
          texto(`${dp} opción ${j + 1}`, o[1]);
          if (o[2] !== null) texto(`${dp} opción ${j + 1} respuesta`, o[2]);
        });
      } else if (p.marca !== undefined) {
        if (!/^[a-z_]+$/.test(p.marca)) err(dp, `marca inválida ${p.marca}`);
      } else if (p.mision !== undefined) {
        texto(dp, p.mision);
      } else if (p.minijuego !== undefined) {
        if (!(p.minijuego in MINIJUEGOS)) err(dp, `minijuego desconocido ${p.minijuego}`);
      } else if (p.efecto !== undefined) {
        if (!EFECTOS.has(p.efecto)) err(dp, `efecto desconocido ${p.efecto}`);
      }
    });
  }
  if (errores.length) throw new Error(`Contenido inválido:\n- ${errores.join("\n- ")}`);
  // Doors: the places each place leads to. The world's guide walks this graph toward where the day goes next.
  const conexiones = Object.fromEntries(Object.entries(mapas).map(([l, m]) => [l, m ? objetosDe(m).filter((o) => o.type === "puerta").map((o) => propiedades(o).destino) : []]));
  // What can be touched in each place (the dashboard's "never touched").
  const objetos = Object.fromEntries(Object.entries(mapas).map(([l, m]) => [l, m ? objetosDe(m).filter((o) => o.type === "objeto").map((o) => o.name) : []]));
  return { version: version(), escenas, textos, figuras, lugares, conexiones, objetos, areas: areasDelMarco() };
}

type Paso = { de?: string; texto?: string; opciones?: [string, string, string | null][]; marca?: string; mision?: string; minijuego?: string; efecto?: string };
type Escena = { id: string; nombre: string; donde: string; al: string; dia?: number; hora?: string; tras?: string | string[]; si?: string[]; no?: string[]; areas?: string[]; delicada?: boolean; saltable?: boolean; pasos: Paso[] };

type ObjetoMapa = { name: string; type: string; properties?: { name: string; value: string }[] };
type Mapa = { width: number; height: number; layers: { name: string; objects?: ObjetoMapa[] }[] };

function leerMapa(lugar: string): Mapa | null {
  const ruta = join(ROOT, "public/mapas", `${lugar}.json`);
  return existsSync(ruta) ? JSON.parse(readFileSync(ruta, "utf8")) : null;
}
const objetosDe = (m: Mapa) => m.layers.find((l) => l.name === "objetos")?.objects ?? [];
const propiedades = (o: ObjetoMapa) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value])) as Record<string, string>;
const medidaDe = (id: string) => leerManifiesto().piezas.find((p) => p.id === id)!.medida;

function validarArte() {
  const m = leerManifiesto();
  const errores: string[] = [];
  for (const p of m.piezas) {
    const real = medidaPng(p.archivo);
    if (!real) errores.push(`${p.archivo}: falta el archivo (npm run provisionales lo crea)`);
    else if (real[0] !== p.medida[0] || real[1] !== p.medida[1])
      errores.push(`${p.archivo}: mide ${real[0]} × ${real[1]}, debe medir ${p.medida[0]} × ${p.medida[1]}`);
  }
  for (const [nombre, r] of Object.entries(m.colores))
    if (r.variantes.some((v) => v.length !== r.clave.length)) errores.push(`colores ${nombre}: cada variante lleva ${r.clave.length} colores`);
  const rampas = Object.keys(m.colores);
  for (const r of RAMPAS) if (!rampas.includes(r)) errores.push(`colores: falta la rampa ${r}`);
  for (const r of rampas) if (!(RAMPAS as readonly string[]).includes(r)) errores.push(`colores: ${r} no está en RAMPAS (herramientas/arte.ts)`);
  for (const p of m.piezas) for (const r of p.colores) if (!m.colores[r]) errores.push(`${p.id}: no hay rampa ${r}`);
  // The game swaps exact colors: a key color repeated in another ramp of the same piece would be swapped twice.
  for (const p of m.piezas) {
    const vistos = p.colores.flatMap((r) => m.colores[r]?.clave ?? []);
    if (new Set(vistos).size !== vistos.length) errores.push(`${p.id}: sus rampas repiten un color clave`);
  }
  if (errores.length) throw new Error(`Arte inválido:\n- ${errores.join("\n- ")}`);
  // Recorded voice lines present in public/assets/voz/; any other line uses the browser voice.
  const carpetaVoz = join(ROOT, "public/assets/voz");
  const voces = existsSync(carpetaVoz) ? readdirSync(carpetaVoz).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)) : [];
  return { ...m, voces };
}

export function contenido(): Plugin {
  return {
    name: "matices-contenido",
    resolveId: (id) => (id in MODULOS ? "\0" + id : undefined),
    load(id) {
      const nombre = id.slice(1);
      if (!id.startsWith("\0") || !(nombre in MODULOS)) return;
      const vigilar = [DOC_CODIGOS, DOC_AREAS, README, MANIFIESTO, join(DIR, "textos.yaml"), join(DIR, "figuras.yaml"), join(DIR, "escenas.yaml"), ...readdirSync(join(ROOT, "public/mapas")).map((f) => join(ROOT, "public/mapas", f))];
      for (const f of vigilar) this.addWatchFile(f);
      return `export default ${JSON.stringify(MODULOS[nombre]())};`;
    },
  };
}
