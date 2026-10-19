// Loads contenido/*.yaml, validates it against the clinical docs and exposes it as
// `virtual:contenido`. Any error stops the build: content without a valid code never ships.
// Sources of truth: codes in docs/clinico/codigos-y-eventos.md, area ids in
// docs/clinico/marco-clinico.md, version in contenido/README.md.
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import type { Plugin } from "vite";

const ROOT = resolve(import.meta.dirname, "..");
const DIR = join(ROOT, "contenido");
const CUENTOS = join(DIR, "cuentos");
const DOC_CODIGOS = join(ROOT, "docs/clinico/codigos-y-eventos.md");
const DOC_AREAS = join(ROOT, "docs/clinico/marco-clinico.md");
const README = join(DIR, "README.md");

const ID = "virtual:contenido";
const RESUELTO = "\0" + ID;

const PERSONAS = new Set(["casa", "casa_adultos", "escuela", "vecino", "nadie", "solo"]);
const AUTOMATICOS = new Set(["OTRA", "NO_SE"]);
const MARCAS = new Set(["{nombre}", "{quien}"]);

type Opcion = [string, string];

function codigosValidos(): Set<string> {
  const doc = readFileSync(DOC_CODIGOS, "utf8");
  return new Set([...doc.matchAll(/`([A-Z][A-Z_]+)`/g)].map((m) => m[1]));
}

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

  if (errores.length) throw new Error(`Contenido inválido:\n- ${errores.join("\n- ")}`);
  return { version: version(), cuentos, sobreMi, escena };
}

export function contenido(): Plugin {
  return {
    name: "matices-contenido",
    resolveId: (id) => (id === ID ? RESUELTO : undefined),
    load(id) {
      if (id !== RESUELTO) return;
      for (const f of [DOC_CODIGOS, DOC_AREAS, README, join(DIR, "sobre-mi.yaml"), join(DIR, "escena-para-describir.yaml")])
        this.addWatchFile(f);
      for (const f of readdirSync(CUENTOS)) this.addWatchFile(join(CUENTOS, f));
      return `export default ${JSON.stringify(validar())};`;
    },
  };
}
