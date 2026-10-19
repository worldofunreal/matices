import Phaser from "phaser";
import contenido, { type Cuento as DatosCuento, type Paso, type Opcion } from "virtual:contenido";
import { variante } from "../arte";
import { Boton, Tarjeta, marco, texto } from "../ui/ui";
import { hablar, callar } from "../ui/voz";
import { estado, cambiarEstado } from "../datos/guardado";
import { personasDeCasa, nombreDe, codigoDe } from "../datos/casa";
import { registrar, semilla } from "../datos/eventos";
import { terminar } from "../datos/cuentos";
import type { DatosDibujo } from "./Dibujo";

const T = contenido.textos.cuento;
const PANEL = contenido.panel;
const ESCUELA = ["maestra", "companero", "conserje", "directora"] as const;
const ESTADOS = ["tranquilo", "inquieto", "alerta", "saturado"] as const;
export type EstadoCuerpo = (typeof ESTADOS)[number];

interface Carta {
  codigo: string;
  etiqueta: string;
  imagen?: string;
}

export interface DatosEscena {
  id: string;
  alTerminar: (estadoCuerpo: EstadoCuerpo | null) => void;
}

type Fase = { tipo: "inicio" } | { tipo: "paso"; i: number } | { tipo: "carita" } | { tipo: "panel" } | { tipo: "cierre" };

// Story mode (GDD §9): the world freezes and La Cuentera's book opens. The child finishes the story:
// who arrives, what they do, and then what; and how the main character feels. No ending is correct.
export class Cuento extends Phaser.Scene {
  private c!: DatosCuento;
  private alTerminar!: (e: EstadoCuerpo | null) => void;
  private fase: Fase = { tipo: "inicio" };
  private rng!: Phaser.Math.RandomDataGenerator;
  private quien: Carta | null = null; // last person chosen, for {quien}
  private anterior: string | null = null; // code chosen in the previous step, for solo_si
  private lineas: string[] = [];
  private carita: number | null = null;
  private elegidos: Record<"cuerpo" | "pensamiento" | "entorno", string[]> = { cuerpo: [], pensamiento: [], entorno: [] };
  private estadoCuerpo: EstadoCuerpo | null = null;
  // Current step
  private cartas: Carta[] = [];
  private marcada: string | null = null;
  private toquesPrevios: string[] = [];
  private finVoz = 0;
  private dibujos: string[] = [];
  private caritaConfirmada = false;
  private cerrando = false; // once closing, every further tap is ignored

  constructor() {
    super("Cuento");
  }

  create(d: DatosEscena) {
    this.c = contenido.cuentos.find((x) => x.id === d.id)!;
    this.alTerminar = d.alTerminar;
    this.rng = new Phaser.Math.RandomDataGenerator([`${semilla()}-${this.c.id}`]);
    this.quien = null;
    this.anterior = null;
    this.lineas = [];
    this.carita = null;
    this.elegidos = { cuerpo: [], pensamiento: [], entorno: [] };
    this.estadoCuerpo = null;
    this.dibujos = [];
    this.caritaConfirmada = false;
    this.cerrando = false;
    registrar("cuento", { cuento: this.c.id, que: "inicio" });
    this.ir({ tipo: "inicio" });
    this.scale.on("resize", this.armar, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.armar, this));
  }

  private nombre() {
    return estado().nombre;
  }

  private llenar(t: string) {
    return t.replaceAll("{nombre}", this.nombre()).replaceAll("{quien}", this.quien?.etiqueta ?? this.nombre());
  }

  // ---- Flow

  private ir(f: Fase): void {
    this.fase = f;
    this.marcada = null;
    this.toquesPrevios = [];
    this.cartas = [];
    if (f.tipo === "paso") {
      const p = this.c.pasos[f.i];
      if (p.id === "carita") return this.ir({ tipo: "carita" });
      if (this.saltar(p)) return this.ir({ tipo: "paso", i: f.i + 1 });
      this.cartas = this.cartasDe(p);
    }
    this.armar();
    void this.decir();
  }

  private siguiente(): void {
    if (this.cerrando) return;
    const f = this.fase;
    if (f.tipo === "inicio") return this.ir({ tipo: "paso", i: 0 });
    if (f.tipo === "paso") return this.ir({ tipo: "paso", i: f.i + 1 });
    if (f.tipo === "carita" || f.tipo === "panel") return this.ir({ tipo: "cierre" });
    this.cerrar("terminado");
  }

  // A step is skipped when solo_si does not match, or when it asks about {quien} and nobody was
  // chosen ("Nadie", "lo resuelve solo" or "No sé") and it has no options for that case
  // (contenido/README.md).
  private saltar(p: Paso) {
    if (p.solo_si && !(this.anterior && p.solo_si.includes(this.anterior))) return true;
    if (p.personas || !p.pregunta?.includes("{quien}")) return false;
    const nadie = !this.quien || ["NADIE", "SOLO"].includes(this.quien.codigo);
    return nadie && !(this.quien && p.opciones_solo);
  }

  private pregunta(): { clave: string; texto: string } {
    const f = this.fase;
    if (f.tipo === "inicio") return { clave: `cuentos.${this.c.id}.inicio`, texto: `${T.inicio} ${this.llenar(this.c.inicio)} ${T.pregunta}` };
    if (f.tipo === "paso") return { clave: `cuentos.${this.c.id}.${this.c.pasos[f.i].id}`, texto: this.llenar(this.c.pasos[f.i].pregunta!) };
    if (f.tipo === "carita") {
      const p = this.c.pasos.find((x) => x.id === "carita");
      return { clave: `cuentos.${this.c.id}.carita`, texto: this.llenar(p?.pregunta ?? T.carita) };
    }
    if (f.tipo === "panel") return { clave: "cuento.estado", texto: T.estado };
    return { clave: "cuento.cierre", texto: T.cierre };
  }

  private async decir() {
    const p = this.pregunta();
    this.finVoz = Number.POSITIVE_INFINITY;
    await hablar(p.clave, p.texto);
    if (this.pregunta().texto === p.texto) this.finVoz = performance.now();
  }

  // ---- Cards

  private cartasDe(p: Paso): Carta[] {
    if (p.personas) return this.personas(p.personas);
    const solo = this.quien && ["NADIE", "SOLO"].includes(this.quien.codigo) && p.opciones_solo;
    const opciones = (solo ? p.opciones_solo : p.opciones)!;
    const base = this.rng.shuffle(opciones.map(([codigo, t]: Opcion) => ({ codigo, etiqueta: this.llenar(t), imagen: `iconos/${codigo.toLowerCase()}` })));
    return [...base, { codigo: "OTRA", etiqueta: T.otra, imagen: "iconos/otra" }, { codigo: "NO_SE", etiqueta: T.no_se, imagen: "interfaz/no_se" }];
  }

  private personas(tipos: string[]): Carta[] {
    const lista: Carta[] = [];
    const desdeCasa = (soloAdultos: boolean) => {
      const gente = personasDeCasa(soloAdultos);
      // An empty house offers a neighbor and nobody instead (GDD §7).
      if (!gente.length) return ["vecino", "nadie"].forEach(agregar);
      for (const f of gente) lista.push({ codigo: codigoDe(f), etiqueta: nombreDe(f), imagen: variante(this, `figuras/retrato_${f.figura}`, { piel: f.piel }) });
    };
    const agregar = (t: string) => {
      if (t === "casa") return desdeCasa(false);
      if (t === "casa_adultos") return desdeCasa(true);
      if (t === "escuela") return ESCUELA.forEach((e) => lista.push({ codigo: `ESCUELA:${e}`, etiqueta: T.escuela[e], imagen: `figuras/retrato_${e}` }));
      if (t === "vecino") return lista.push({ codigo: "VECINO", etiqueta: T.vecino, imagen: "figuras/retrato_vecino" });
      if (t === "nadie") return lista.push({ codigo: "NADIE", etiqueta: T.nadie, imagen: "interfaz/persona_nadie" });
      if (t === "solo") return lista.push({ codigo: "SOLO", etiqueta: this.llenar(T.solo), imagen: "interfaz/persona_solo" });
    };
    tipos.forEach(agregar);
    const unicas = lista.filter((c, i) => lista.findIndex((x) => x.codigo === c.codigo) === i);
    return [...this.rng.shuffle(unicas), { codigo: "NO_SE", etiqueta: T.no_se, imagen: "interfaz/no_se" }];
  }

  private tocar(carta: Carta) {
    if (this.cerrando) return;
    if (this.marcada !== carta.codigo) {
      this.marcada = carta.codigo;
      this.toquesPrevios.push(carta.codigo);
      void hablar(`cuentos.${this.c.id}.carta`, carta.etiqueta);
      this.armar();
      return;
    }
    this.elegir(carta);
  }

  private elegir(carta: Carta) {
    const f = this.fase as { tipo: "paso"; i: number };
    const p = this.c.pasos[f.i];
    const ms = performance.now() - this.finVoz;
    registrar("cuento_paso", {
      cuento: this.c.id,
      paso: p.id,
      opciones: this.cartas.map((x) => x.codigo),
      elegida: carta.codigo,
      toques_previos: this.toquesPrevios.slice(0, -1),
      ms_decidir: Number.isFinite(ms) ? Math.round(ms) : null,
      antes_de_la_voz: !Number.isFinite(ms),
    });
    if (p.personas) this.quien = carta.codigo === "NO_SE" ? null : carta;
    this.anterior = carta.codigo;
    if (carta.codigo !== "NO_SE") this.lineas.push(`${p.personas ? this.llenar(p.pregunta!) + " " : ""}${carta.etiqueta}`);
    if (carta.codigo === "OTRA") return this.dibujar(`${this.c.id}.${p.id}`);
    this.siguiente();
  }

  // "Otra cosa": the child draws it. The world and the story wait.
  private dibujar(origen: string) {
    callar();
    const datos: DatosDibujo = {
      origen,
      consigna: T.dibujar,
      alTerminar: (imagen) => {
        if (imagen) this.dibujos.push(imagen);
        this.scene.resume();
        this.siguiente();
      },
    };
    this.scene.pause();
    this.scene.launch("Dibujo", datos);
    this.scene.bringToTop("Dibujo");
  }

  // ---- Feelings

  private elegirCarita(v: number) {
    if (this.carita !== v) {
      this.carita = v;
      void hablar("cuento.caritas", T.caritas[v - 1]);
      this.armar();
      return;
    }
    registrar("carita", { cuento: this.c.id, valor: v });
    this.caritaConfirmada = true;
    this.armar();
  }

  private alternar(grupo: "cuerpo" | "pensamiento" | "entorno", id: string, etiqueta: string) {
    const l = this.elegidos[grupo];
    this.elegidos[grupo] = l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
    if (!l.includes(id)) void hablar(`panel.${id}`, etiqueta);
    this.armar();
  }

  private terminarPanel() {
    registrar("panel_cpe", { cuento: this.c.id, ...this.elegidos });
    if (this.estadoCuerpo) registrar("estado_cuerpo", { cuento: this.c.id, estado: this.estadoCuerpo });
    this.siguiente();
  }

  // ---- Endings

  private ahoraNo() {
    if (this.cerrando) return;
    const f = this.fase;
    registrar("ahora_no", { cuento: this.c.id, paso: f.tipo === "paso" ? this.c.pasos[f.i].id : f.tipo });
    void hablar("cuento.ahora_no", T.ahora_no);
    this.cerrar("ahora_no");
  }

  private cerrar(como: "terminado" | "ahora_no") {
    if (this.cerrando) return;
    this.cerrando = true;
    terminar(this.c.id, como);
    registrar("cuento", { cuento: this.c.id, que: como === "terminado" ? "fin" : "ahora_no" });
    if (como === "terminado") {
      const libro = [...estado().libro, { cuento: this.c.id, titulo: this.c.titulo, lineas: [this.llenar(this.c.inicio), ...this.lineas], carita: this.carita, dibujos: this.dibujos }];
      cambiarEstado({ libro }, true);
    }
    const alTerminar = this.alTerminar;
    const estadoCuerpo = como === "terminado" ? this.estadoCuerpo : null;
    this.time.delayedCall(como === "terminado" ? 400 : 1600, () => {
      this.scene.stop();
      alTerminar(estadoCuerpo);
    });
  }

  // ---- Layout: the book at the bottom over the frozen world, with "Ahora no" and "Volver a escuchar".

  private armar() {
    const caritaConfirmada = this.caritaConfirmada;
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
    this.add.rectangle(0, 0, w, h, 0x1d1a24, 0.45).setOrigin(0).setInteractive(); // blocks taps on the world
    const horizontal = w > h;
    const lh = Math.round(horizontal ? h - 24 : h * 0.72);
    const lw = w - 16;
    const ly = h - lh / 2 - 8;
    marco(this, w / 2, ly, lw, lh, "interfaz/marco_libro");
    const top = ly - lh / 2;
    this.add.image(16 + 24, top + 30, "personajes/retrato_cuentera_neutral").setScale(0.5);
    const p = this.pregunta();
    const t = texto(this, w / 2 + 10, 0, p.texto, 13, lw - 150);
    t.setY(top + 14 + t.height / 2);
    const zonaArriba = Math.max(top + 64, t.y + t.height / 2 + 10);
    const zona = { x: 16, y: zonaArriba, w: lw - 16, h: ly + lh / 2 - zonaArriba - 48 };
    const abajo = ly + lh / 2 - 26;

    const f = this.fase;
    if (f.tipo === "paso") this.mostrarCartas(zona);
    if (f.tipo === "carita") this.mostrarCaritas(zona, caritaConfirmada);
    if (f.tipo === "panel") this.mostrarPanel(zona);
    if (f.tipo === "inicio" || (f.tipo === "carita" && caritaConfirmada) || f.tipo === "cierre") {
      const etiqueta = f.tipo === "carita" ? T.listo : undefined;
      new Boton(this, w - 60, abajo, etiqueta ? { ancho: 100, alto: 32, etiqueta } : { ancho: 40, alto: 32, imagen: "interfaz/boton_flecha_der" }, () => this.siguiente());
    }
    if (f.tipo === "carita" && caritaConfirmada) new Boton(this, w / 2, abajo, { ancho: 120, alto: 32, etiqueta: T.contar_mas, voz: { clave: "cuento.contar_mas", texto: T.contar_mas } }, () => this.ir({ tipo: "panel" }));
    if (f.tipo === "panel") new Boton(this, w - 60, abajo, { ancho: 100, alto: 32, etiqueta: T.listo }, () => this.terminarPanel());
    if (f.tipo !== "cierre") new Boton(this, 70, abajo, { ancho: 110, alto: 32, etiqueta: T.boton_ahora_no, imagen: "interfaz/boton_ahora_no" }, () => this.ahoraNo());
    new Boton(this, w - 30, top + 24, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, () => {
      registrar("repetir_voz", { pantalla: `${this.c.id}.${f.tipo === "paso" ? this.c.pasos[f.i].id : f.tipo}` });
      void this.decir();
    });
  }

  // Cards laid out to fill the space: as many per row as fit, never wider than 110 px.
  private mostrarCartas(z: { x: number; y: number; w: number; h: number }) {
    const n = this.cartas.length;
    let mejor = { cols: 1, cw: 0, ch: 0 };
    for (let cols = 1; cols <= n; cols++) {
      const filas = Math.ceil(n / cols);
      const cw = Math.min(110, (z.w - (cols - 1) * 6) / cols);
      const ch = Math.min(cw * 1.25, (z.h - (filas - 1) * 6) / filas);
      if (Math.min(cw, ch / 1.25) > Math.min(mejor.cw, mejor.ch / 1.25)) mejor = { cols, cw, ch };
    }
    const { cols, cw, ch } = mejor;
    const filas = Math.ceil(n / cols);
    this.cartas.forEach((carta, i) => {
      const fila = Math.floor(i / cols);
      const enFila = Math.min(cols, n - fila * cols);
      const x0 = z.x + z.w / 2 - (enFila * (cw + 6) - 6) / 2 + cw / 2;
      const y0 = z.y + z.h / 2 - (filas * (ch + 6) - 6) / 2 + ch / 2;
      new Tarjeta(this, x0 + (i % cols) * (cw + 6), y0 + fila * (ch + 6), { ancho: cw, alto: ch, etiqueta: carta.etiqueta, imagen: carta.imagen }, () => this.tocar(carta)).marcar(this.marcada === carta.codigo);
    });
  }

  private mostrarCaritas(z: { x: number; y: number; w: number; h: number }, confirmada: boolean) {
    const lado = Math.min(64, (z.w - 40) / 5);
    T.caritas.forEach((etiqueta, i) => {
      const v = i + 1;
      const b = new Boton(this, z.x + z.w / 2 + (i - 2) * (lado + 8), z.y + z.h / 2 - 10, { ancho: lado, alto: lado, imagen: `interfaz/carita_${v}` }, () => !confirmada && this.elegirCarita(v));
      b.elegir(this.carita === v);
      texto(this, b.x, b.y + lado / 2 + 10, etiqueta, 9, lado + 6);
    });
  }

  // Optional panel: body, thoughts, surroundings (several or none), and the state of the surroundings,
  // which only the child chooses (GDD §9, "Estados del cuerpo").
  private mostrarPanel(z: { x: number; y: number; w: number; h: number }) {
    const grupos = ["cuerpo", "pensamiento", "entorno"] as const;
    const filas = grupos.length + 1;
    const fh = z.h / filas;
    grupos.forEach((g, gi) => {
      const y = z.y + fh * gi + fh / 2;
      texto(this, z.x + 40, y, T.panel[g], 10, 76);
      const ops = PANEL[g];
      const bw = Math.min(110, (z.w - 90) / Math.ceil(ops.length / Math.max(1, Math.floor(fh / 30))));
      const porFila = Math.max(1, Math.floor((z.w - 90) / (bw + 4)));
      ops.forEach(([id, etiqueta], i) => {
        const bh = Math.min(26, fh / Math.ceil(ops.length / porFila) - 2);
        const x = z.x + 90 + (i % porFila) * (bw + 4) + bw / 2;
        const yy = y - fh / 2 + 2 + Math.floor(i / porFila) * (bh + 2) + bh / 2;
        new Boton(this, x, yy, { ancho: bw, alto: bh, etiqueta, imagen: `panel/${id}`, tamTexto: 8 }, () => this.alternar(g, id, etiqueta)).elegir(this.elegidos[g].includes(id));
      });
    });
    const y = z.y + fh * grupos.length + fh / 2;
    ESTADOS.forEach((e, i) => {
      const bw = Math.min(110, (z.w - 20) / 4 - 6);
      new Boton(this, z.x + z.w / 2 + (i - 1.5) * (bw + 6), y, { ancho: bw, alto: 28, etiqueta: T.estados[e], voz: { clave: `cuento.estados.${e}`, texto: T.estados[e] } }, () => {
        this.estadoCuerpo = this.estadoCuerpo === e ? null : e;
        this.armar();
      }).elegir(this.estadoCuerpo === e);
    });
  }
}
