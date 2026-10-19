// Loads contenido/*.yaml and public/assets/manifiesto.yaml, validates them and exposes them as
// `virtual:contenido` and `virtual:arte`. Any error stops the build: content without a valid code
// and art with a missing file or a wrong size never ship.
// Sources of truth: codes in docs/clinico/codigos-y-eventos.md, area ids in
// docs/clinico/marco-clinico.md, version in contenido/README.md, art in public/assets/manifiesto.yaml.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Plugin } from "vite";
import { ROOT, MANIFIESTO, DOC_CODIGOS, PANEL_CPE, codigosValidos, panelCpe, leerManifiesto, medidaPng } from "./arte.ts";

const DIR = join(ROOT, "contenido");
const CUENTOS = join(DIR, "cuentos");
const DOC_AREAS = join(ROOT, "docs/clinico/marco-clinico.md");
const README = join(DIR, "README.md");

const MODULOS: Record<string, () => unknown> = { "virtual:contenido": validar, "virtual:arte": validarArte };

const PERSONAS = new Set(["casa", "casa_adultos", "escuela", "vecino", "nadie", "solo"]);
const AUTOMATICOS = new Set(["OTRA", "NO_SE"]);
const MARCAS = new Set(["{nombre}", "{quien}"]);

type Opcion = [string, string];

function areasValidas(): Set<string> {
  const doc = readFileSync(DOC_AREAS, "utf8");
  return new Set([...doc.matchAll(/^\|[^|]+\|[^|]+\| `([a-z_]+)` \|/gm)].map((m) => m[1]));
}

function version(): string {
  const m = readFileSync(README, "utf8").match(/Versión del contenido: `([0-9.]+)`/);
  if (!m) throw new Error("contenido/README.md no dice la versión del contenido");
  return m[1];
}

function validar() {
  const codigos = codigosValidos();
  const areas = areasValidas();
  const errores: string[] = [];
  const err = (donde: string, msg: string) => errores.push(`${donde}: ${msg}`);

  const texto = (donde: string, t: unknown, conQuien: boolean) => {
    if (typeof t !== "string" || !t.trim()) return err(donde, "texto vacío");
    for (const m of t.match(/\{[^}]*\}/g) ?? []) {
      if (!MARCAS.has(m)) err(donde, `marca desconocida ${m}`);
      if (m === "{quien}" && !conQuien) err(donde, "{quien} sin un paso de personas antes");
    }
  };
  const codigo = (donde: string, c: unknown) => {
    if (typeof c !== "string" || !codigos.has(c)) err(donde, `código inexistente ${String(c)}`);
    else if (AUTOMATICOS.has(c)) err(donde, `${c} se agrega solo; no se escribe`);
  };
  const opciones = (donde: string, lista: unknown, conQuien: boolean) => {
    if (!Array.isArray(lista) || lista.length === 0) return err(donde, "lista de opciones vacía");
    lista.forEach((o, i) => {
      if (!Array.isArray(o) || o.length !== 2) return err(`${donde}[${i}]`, "debe ser [CÓDIGO, texto]");
      codigo(`${donde}[${i}]`, o[0]);
      texto(`${donde}[${i}]`, o[1], conQuien);
    });
  };
  const area = (donde: string, a: unknown) => {
    if (typeof a !== "string" || !areas.has(a)) err(donde, `área inexistente ${String(a)}`);
  };

  const cuentos = readdirSync(CUENTOS)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => {
      const c = parse(readFileSync(join(CUENTOS, f), "utf8"));
      const d = `cuentos/${f}`;
      if (c.id !== f.replace(".yaml", "")) err(d, `el id ${c.id} no coincide con el archivo`);
      if (![1, 2, 3].includes(c.dia)) err(d, "dia debe ser 1, 2 o 3");
      if (!["baja", "media"].includes(c.intensidad)) err(d, "intensidad debe ser baja o media");
      if (!["manana", "tarde", "noche"].includes(c.hora)) err(d, "hora debe ser manana, tarde o noche");
      if (typeof c.lugar !== "string") err(d, "falta lugar");
      area(`${d} area_principal`, c.area_principal);
      (c.areas ?? []).forEach((a: unknown) => area(`${d} areas`, a));
      texto(`${d} inicio`, c.inicio, false);
      if (!Array.isArray(c.pasos) || c.pasos.length === 0) err(d, "sin pasos");
      let conQuien = false;
      const vistos = new Set<string>();
      for (const p of c.pasos ?? []) {
        const dp = `${d} paso ${p.id}`;
        if (vistos.has(p.id)) err(dp, "id de paso repetido");
        vistos.add(p.id);
        if (p.id === "carita") continue;
        texto(`${dp} pregunta`, p.pregunta, conQuien);
        if (p.personas) {
          if (p.opciones) err(dp, "un paso lleva personas u opciones, no ambas");
          for (const x of p.personas) if (!PERSONAS.has(x)) err(dp, `persona inexistente ${x}`);
          conQuien = true;
        } else {
          opciones(`${dp} opciones`, p.opciones, conQuien);
        }
        if (p.opciones_solo) opciones(`${dp} opciones_solo`, p.opciones_solo, conQuien);
        for (const s of p.solo_si ?? []) codigo(`${dp} solo_si`, s);
      }
      if (c.pasos?.at(-1)?.id !== "carita") err(d, "el último paso debe ser carita");
      return c;
    });

  const sobreMi = parse(readFileSync(join(DIR, "sobre-mi.yaml"), "utf8"));
  texto("sobre-mi aviso", sobreMi.aviso, false);
  for (const f of sobreMi.frases ?? []) {
    area(`sobre-mi ${f.id}`, f.area);
    texto(`sobre-mi ${f.id} a`, f.a, false);
    texto(`sobre-mi ${f.id} b`, f.b, false);
  }

  const escena = parse(readFileSync(join(DIR, "escena-para-describir.yaml"), "utf8"));
  opciones(`escena ${escena.id} titulos`, escena.titulos as Opcion[], false);

  const panel = panelCpe();
  for (const [grupo, ops] of Object.entries(panel)) {
    if (!["cuerpo", "pensamiento", "entorno"].includes(grupo)) err("panel-cpe", `grupo desconocido ${grupo}`);
    for (const o of ops) {
      if (!Array.isArray(o) || !/^[a-z_]+$/.test(o[0])) err(`panel-cpe ${grupo}`, `id inválido ${String(o?.[0])}`);
      texto(`panel-cpe ${grupo} ${o?.[0]}`, o?.[1], false);
    }
  }

  const textos = parse(readFileSync(join(DIR, "textos.yaml"), "utf8"));
  const marcasTextos = new Set(["{psicologo}", "{nombre}", "{n}"]);
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

  if (errores.length) throw new Error(`Contenido inválido:\n- ${errores.join("\n- ")}`);
  return { version: version(), cuentos, sobreMi, escena, panel, textos };
}

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
      const vigilar = [DOC_CODIGOS, DOC_AREAS, README, PANEL_CPE, MANIFIESTO, join(DIR, "textos.yaml"), join(DIR, "sobre-mi.yaml"), join(DIR, "escena-para-describir.yaml")];
      for (const f of vigilar) this.addWatchFile(f);
      for (const f of readdirSync(CUENTOS)) this.addWatchFile(join(CUENTOS, f));
      return `export default ${JSON.stringify(MODULOS[nombre]())};`;
    },
  };
}
