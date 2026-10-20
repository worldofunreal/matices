// npm run simular: 20 made-up participants for working on the dashboard locally. Their choices are random picks
// from the real content; their codes start with "sim-". Only for the local server (npm run dev).
import { validar } from "./contenido.ts";

const C = validar();
const N = Number(process.argv[2] ?? 20);
const SERVIDOR = "http://127.0.0.1:3200/api/eventos";
const azar = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const entre = (a: number, b: number) => Math.round(a + Math.random() * (b - a));
const APARATOS = [
  "Mozilla/5.0 (Linux; Android 12; SM-A125M) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
];

function participante(i: number) {
  const nino = `sim-${String(i).padStart(2, "0")}`;
  const eventos: Record<string, unknown>[] = [];
  let id = 0, t = 0, sesion = 1;
  const inicio = Date.now() - entre(1, 5) * 864e5;
  const ev = (tipo: string, datos: Record<string, unknown> = {}, pasa = entre(2, 20) * 1000) => {
    t += pasa;
    eventos.push({ ...datos, nino, id: ++id, sesion, contenido: C.version, juego: "sim", entorno: "simulado", semilla: i, t_ms: t, cuando: inicio + t, tipo });
  };
  const pantalla = (p: string, anterior: string | null) => ev("pantalla", { pantalla: p, anterior }, 500);
  const figuras = [...C.figuras].sort(() => Math.random() - 0.5).slice(0, entre(1, 5));
  const llega = Math.random(); // how far this one gets

  ev("aparato", { navegador: azar(APARATOS), pantalla: [390, 844] }, 0);
  ev("sesion", { que: "inicio" }, 0);
  pantalla("creacion", null);
  ev("personaje", { momento: "inicio", cuerpo: azar(["nina", "nino", "neutro"]), tono: entre(1, 8), cabello: azar(["01", "02", "03", "04", "05", "06"]), color_cabello: entre(1, 6), ropa: azar(["uniforme_pantalon", "uniforme_falda", "casa"]), extras: Math.random() < 0.4 ? ["mochila"] : [], color_mochila: 2, nombre_de_lista: Math.random() < 0.6, toques: entre(8, 30), ms: entre(40, 180) * 1000 }, entre(40, 180) * 1000);
  if (llega < 0.05) return eventos;
  pantalla("casa", "creacion");
  const cuartos = Object.keys(C.textos.casa.cuartos);
  ev("casa_lista", { figuras: figuras.map((f) => ({ figura: `FIGURA:${f.id}`, clase: f.tipo, cuarto: azar(cuartos), distancia: entre(1, 12), renombrada: Math.random() < 0.2, tono: entre(1, 8) })), prota_cuarto: azar(cuartos), toques: entre(10, 40), ms: entre(60, 300) * 1000 }, entre(60, 300) * 1000);
  if (Math.random() < 0.3) ev("toque_sin_efecto", { pantalla: "casa", x: Math.random(), y: Math.random() });
  if (llega < 0.12) return eventos;
  pantalla("mundo", "casa");
  for (const dia of [1, 2, 3]) {
    if (dia > 1) {
      sesion++;
      t = 0;
      ev("sesion", { que: "regreso" }, 0);
      pantalla("mundo", null);
    }
    ev("tramo", { dia, hora: "manana" }, 1000);
    for (const lugar of [...C.lugares].sort(() => Math.random() - 0.5).slice(0, entre(2, 5))) {
      const objetos = (C.objetos[lugar] ?? []).filter(() => Math.random() < 0.4);
      for (const objeto of objetos) ev("explora", { lugar, objeto });
      ev("explora", { lugar, ms: entre(20, 200) * 1000, visitas: entre(1, 3) });
      if (Math.random() < 0.25) ev("toque_sin_efecto", { pantalla: "mundo", x: Math.random(), y: Math.random() });
    }
    for (const c of C.cuentos.filter((x: { dia: number }) => x.dia === dia)) {
      ev("cuento", { cuento: c.id, que: "inicio" });
      let solo = false, dejo = false;
      for (const p of c.pasos) {
        if (Math.random() < 0.04) {
          ev("ahora_no", { cuento: c.id, paso: p.id });
          dejo = true;
          break;
        }
        if (Math.random() < 0.3) ev("repetir_voz", { pantalla: c.id, clave: `${c.id}.${p.id}` }, 1000);
        const opciones: string[] = p.personas ? [...figuras.map((f) => `FIGURA:${f.id}`), "NADIE", "SOLO", "NO_SE"] : [...(solo && p.opciones_solo ? p.opciones_solo : p.opciones ?? []).map((o: string[]) => o[0]), "OTRA", "NO_SE"];
        if (!opciones.length) continue;
        const elegida = azar(opciones);
        if (elegida === "SOLO") solo = true;
        ev("cuento_paso", { cuento: c.id, paso: p.id, opciones, elegida, ms_decidir: entre(1500, 20000) });
      }
      if (!dejo) {
        ev("carita", { cuento: c.id, valor: entre(1, 5) });
        ev("cuento", { cuento: c.id, que: "fin" });
      } else ev("cuento", { cuento: c.id, que: "ahora_no" });
      if (Math.random() < 0.15) ev("inactividad", { pantalla: c.id, ms: entre(30, 120) * 1000 });
    }
    ev("rendimiento", { fps: entre(30, 60), memoria_mb: entre(60, 140) });
    if (dia === 3) for (const f of C.sobreMi.frases) ev("sobre_mi", { frase: f.id, area: f.area, respuesta: azar(["A", "B", "AMBOS", "AHORA_NO"]), tito_dice: azar(["A", "B"]), ms_decidir: entre(1500, 9000) }, 6000);
    if (Math.random() < 0.03) ev("quiero_hablar", { pantalla: "mundo" });
    if (llega < 0.12 + dia * 0.25) return eventos;
    ev("tramo", { dia, hora: dia === 3 ? "fin" : "noche" });
  }
  return eventos;
}

let total = 0;
for (let i = 1; i <= N; i++) {
  const evs = participante(i);
  const r = await fetch(SERVIDOR, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(evs) });
  if (!r.ok) throw new Error(`El servidor respondió ${r.status} (¿está corriendo npm run dev?)`);
  total += evs.length;
}
console.log(`${N} participantes simulados, ${total} eventos.`);
