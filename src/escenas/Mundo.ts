import Phaser from "phaser";
import contenido from "virtual:contenido";
import { Protagonista } from "../personaje/Protagonista";
import { variante } from "../arte";
import { estado, cambiarEstado, type Estado } from "../datos/guardado";
import { bloqueo, revisarHora, puedeDormir, dormir } from "../datos/dia";
import { tocaAqui, siguiente, sitio } from "../datos/cuentos";
import type { DatosEscena, EstadoCuerpo } from "./Cuento";
import { registrar } from "../datos/eventos";
import type { Interfaz } from "./Interfaz";

const VELOCIDAD = 90;
const TILE = 32;
const M = contenido.textos.mundo;

// Night and afternoon light over the place (docs/arte/direccion-de-arte.md: a multiplied layer,
// never full darkness). Morning has none.
const LUZ = { manana: null, tarde: 0xffe6c4, noche: 0x6f7fb8 } as const;

type Celda = { x: number; y: number };
type Puerta = { nombre: string; rect: Phaser.Geom.Rectangle; destino: string; llegada: string; horas?: string };
type ObjetoMapa = Phaser.Types.Tilemaps.TiledObject;

// How the surroundings look for a few seconds after a story, only if the child chose it (GDD §9).
const AMBIENTE: Record<EstadoCuerpo, { color: number; alfa: number; zoom: number }> = {
  tranquilo: { color: 0x9fd7b0, alfa: 0.25, zoom: 1 },
  inquieto: { color: 0xf2d36b, alfa: 0.3, zoom: 1 },
  alerta: { color: 0xf29b4b, alfa: 0.35, zoom: 1.04 },
  saturado: { color: 0x8c5a7a, alfa: 0.4, zoom: 1.06 },
};

const prop = (o: ObjetoMapa, nombre: string): string | undefined =>
  (o.properties as { name: string; value: string }[] | undefined)?.find((p) => p.name === nombre)?.value;

// One explorable place: the art is lugares/<lugar>/fondo.png; walls, doors, arrival points,
// objects and people come from the Tiled map public/mapas/<lugar>.json.
export class Mundo extends Phaser.Scene {
  private lugar = "casa";
  private prota!: Protagonista;
  private cuerpo!: Phaser.Physics.Arcade.Body;
  private muros!: Phaser.Tilemaps.TilemapLayer;
  private teclas!: Record<"arriba" | "abajo" | "izq" | "der", Phaser.Input.Keyboard.Key[]>;
  private ruta: Phaser.Math.Vector2[] = [];
  private alLlegar: (() => void) | null = null;
  private puertas: Puerta[] = [];
  private enPuerta: string | null = null; // the door the character is standing in, so it fires once
  private cambiando = false;
  private t0 = 0;
  private guia: Phaser.GameObjects.Arc | null = null;

  constructor() {
    super("Mundo");
  }

  private get interfaz() {
    return this.scene.get("Interfaz") as Interfaz;
  }

  create(e: Estado) {
    this.lugar = e.lugar;
    this.cambiando = false;
    this.enPuerta = null;
    this.ruta = [];
    this.alLlegar = null;
    this.t0 = performance.now();
    if (!this.scene.isActive("Interfaz")) this.scene.launch("Interfaz");
    this.scene.bringToTop("Interfaz");

    const mapa = this.make.tilemap({ key: e.lugar });
    this.add.image(0, 0, `lugares/${e.lugar}/fondo`).setOrigin(0).setDepth(-1);
    const rejilla = mapa.addTilesetImage("provisional", "rejilla")!;
    this.muros = mapa.createLayer("muros", rejilla)!.setVisible(this.physics.world.drawDebug);
    this.muros.setCollisionByExclusion([-1]);
    const objetos = mapa.getObjectLayer("objetos")!.objects;

    const inicio = objetos.find((o) => o.type === "llegada" && o.name === e.llegada) ?? objetos.find((o) => o.name === "inicio") ?? objetos.find((o) => o.type === "llegada")!;
    this.prota = new Protagonista(this, e.x ?? inicio.x!, e.y ?? inicio.y!, e.apariencia);
    this.prota.direccion = e.direccion;
    this.physics.add.existing(this.prota);
    this.cuerpo = this.prota.body as Phaser.Physics.Arcade.Body;
    this.cuerpo.setSize(20, 12).setOffset(-10, -12);
    this.cuerpo.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, mapa.widthInPixels, mapa.heightInPixels);
    this.physics.add.collider(this.prota, this.muros);
    cambiarEstado({ llegada: null, x: Math.round(this.prota.x), y: Math.round(this.prota.y) });

    this.puertas = objetos
      .filter((o) => o.type === "puerta")
      .map((o) => ({ nombre: o.name, rect: new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!), destino: prop(o, "destino")!, llegada: prop(o, "llegada")!, horas: prop(o, "horas") }));
    // The character may arrive standing on a door (e.g. a saved spot); it must step off first.
    this.enPuerta = this.puertas.find((p) => p.rect.contains(this.cuerpo.center.x, this.cuerpo.center.y))?.nombre ?? null;

    this.encuadrar(mapa);
    const encuadrar = () => this.encuadrar(mapa);
    this.scale.on("resize", encuadrar);
    this.events.once("shutdown", () => this.scale.off("resize", encuadrar));
    this.cameras.main.startFollow(this.prota, true);

    const k = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = {
      arriba: [k.addKey(K.UP), k.addKey(K.W)],
      abajo: [k.addKey(K.DOWN), k.addKey(K.S)],
      izq: [k.addKey(K.LEFT), k.addKey(K.A)],
      der: [k.addKey(K.RIGHT), k.addKey(K.D)],
    };

    for (const o of objetos) {
      if (o.type === "objeto") this.colocarObjeto(o);
      if (o.type === "npc") this.colocarPersona(o);
    }
    // The people the child put in the house stand where they were placed.
    if (e.lugar === "casa")
      for (const f of e.casa) this.add.sprite(f.x, f.y, variante(this, `figuras/${f.figura}`, { piel: f.piel }), 0).setOrigin(0.5, 1).setDepth(f.y);

    const luz = LUZ[e.hora];
    if (luz) {
      const capa = this.add.rectangle(0, 0, mapa.widthInPixels, mapa.heightInPixels, luz).setOrigin(0).setDepth(1e5);
      capa.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    this.input.on("pointerdown", (p: Phaser.Input.Pointer, encima: Phaser.GameObjects.GameObject[]) => {
      if (encima.length) return; // tapped an object or a person; it handles itself
      this.alLlegar = null;
      this.caminarA(p.worldX, p.worldY);
    });

    const visitas = { ...e.visitas, [e.lugar]: (e.visitas[e.lugar] ?? 0) + 1 };
    cambiarEstado({ visitas });
    this.events.once("shutdown", () => registrar("explora", { lugar: this.lugar, ms: Math.round(performance.now() - this.t0), visitas: visitas[this.lugar] }));

    this.guiar(objetos);

    if (this.physics.world.drawDebug) {
      this.muros.renderDebug(this.add.graphics().setAlpha(0.5).setDepth(1e5 + 1), { tileColor: null });
      for (const o of objetos) this.add.text(o.x!, o.y!, o.name, { fontSize: "8px", color: "#000" }).setOrigin(0.5).setDepth(1e6);
      for (const p of this.puertas) this.add.rectangle(p.rect.x, p.rect.y, p.rect.width, p.rect.height).setOrigin(0).setStrokeStyle(1, 0x00aa00).setDepth(1e6);
    }
  }

  // Objects with something to look at glow softly; tapping one walks next to it and the character
  // says a neutral line about it (GDD §10).
  private colocarObjeto(o: ObjetoMapa) {
    const img = this.add.image(o.x!, o.y!, prop(o, "arte") ?? `lugares/${this.lugar}/${o.name}`).setOrigin(0.5, 1).setDepth(o.y!);
    img.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: img, alpha: 0.82, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    img.on("pointerdown", () => this.irA(o, () => this.usar(o.name)));
  }

  // Fixed people only greet with neutral lines; they never ask how the child is (GDD §8).
  private colocarPersona(o: ObjetoMapa) {
    const horas = prop(o, "horas");
    if (horas && !horas.split(",").includes(estado().hora)) {
      this.muros.removeTileAt(this.muros.worldToTileX(o.x!)!, this.muros.worldToTileY(o.y! - 1)!);
      return;
    }
    const s = this.add.sprite(o.x!, o.y!, `personajes/${o.name}`, 0).setOrigin(0.5, 1).setDepth(o.y!);
    s.setInteractive({ useHandCursor: true });
    s.on("pointerdown", () =>
      this.irA(o, () => {
        const saludos = M.saludos[o.name];
        const i = (estado().visitas[this.lugar] ?? 0) % saludos.length;
        registrar("explora", { lugar: this.lugar, persona: o.name });
        this.interfaz.decir(`mundo.saludos.${o.name}.${i}`, saludos[i]);
      }),
    );
  }

  private usar(objeto: string) {
    registrar("explora", { lugar: this.lugar, objeto });
    if (objeto === "espejo") return this.scene.start("Creacion", { modo: "espejo" });
    if (objeto === "cama" && estado().hora === "noche") {
      if (puedeDormir()) return this.terminarDia();
      return this.interfaz.decir("mundo.sin_sueno", M.sin_sueno);
    }
    const frase = M.objetos[this.lugar]?.[objeto] ?? M.objetos.comun[objeto];
    this.interfaz.decir(`mundo.objetos.${this.lugar}.${objeto}`, frase);
  }

  private terminarDia() {
    this.cambiando = true;
    this.interfaz.decir("mundo.dormir", M.dormir);
    const dia = dormir();
    this.time.delayedCall(1200, () => {
      // After the third day H6 adds "Sobre mí" and the landing; until then the closing card stays.
      if (dia === null) return this.interfaz.cartel(M.fin, null);
      this.interfaz.cartel(M.dia.replace("{n}", String(dia)), 2500, () => this.scene.restart(estado()));
    });
  }

  private irA(o: ObjetoMapa, accion: () => void) {
    this.alLlegar = accion;
    this.caminarA(o.x!, o.y! + TILE / 2);
    if (!this.ruta.length) this.llegar();
  }

  private llegar() {
    const accion = this.alLlegar;
    this.alLlegar = null;
    accion?.();
  }

  private revisarPuertas() {
    const c = this.cuerpo.center;
    const p = this.puertas.find((d) => d.rect.contains(c.x, c.y));
    if (!p) {
      this.enPuerta = null;
      return;
    }
    if (this.enPuerta === p.nombre) return;
    this.enPuerta = p.nombre;
    const no = bloqueo(this.lugar, p.destino, p.horas);
    if (no) return this.interfaz.decir(`mundo.${no}`, M[no]);
    this.cambiando = true;
    cambiarEstado({ lugar: p.destino, llegada: p.llegada, x: null, y: null }, true);
    revisarHora(p.destino, this.lugar);
    this.cameras.main.fadeOut(200);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.restart(estado()));
  }

  // The camera follows inside the map; on an axis where the map is smaller than the screen, it is centered.
  private encuadrar(mapa: Phaser.Tilemaps.Tilemap) {
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    const eje = (mide: number, vista: number) => (mide >= vista ? [0, mide] : [(mide - vista) / 2, vista]);
    const [x, w] = eje(mapa.widthInPixels, cam.width);
    const [y, h] = eje(mapa.heightInPixels, cam.height);
    cam.setBounds(x, y, w, h);
  }

  update() {
    if (this.cambiando) {
      this.cuerpo.setVelocity(0, 0);
      return;
    }
    const v = new Phaser.Math.Vector2(
      Number(this.teclas.der.some((t) => t.isDown)) - Number(this.teclas.izq.some((t) => t.isDown)),
      Number(this.teclas.abajo.some((t) => t.isDown)) - Number(this.teclas.arriba.some((t) => t.isDown)),
    );
    if (v.lengthSq() > 0) {
      this.ruta = [];
      this.alLlegar = null;
      this.cuerpo.setVelocity(v.x, v.y).velocity.normalize().scale(VELOCIDAD);
    } else {
      this.seguirRuta();
    }
    this.prota.mover(this.cuerpo.velocity.x, this.cuerpo.velocity.y);
    this.prota.setDepth(this.prota.y);
    cambiarEstado({ x: Math.round(this.prota.x), y: Math.round(this.prota.y), direccion: this.prota.direccion });
    this.revisarPuertas();
    const c = !this.cambiando && tocaAqui(this.lugar, this.cuerpo.center.x, this.cuerpo.center.y);
    if (c) this.abrirCuento(c.id);
  }

  // The world freezes and the story opens over it (GDD §9).
  private abrirCuento(id: string) {
    this.cambiando = true;
    this.ruta = [];
    this.alLlegar = null;
    this.prota.mover(0, 0);
    const datos: DatosEscena = { id, alTerminar: (e) => this.alVolverDelCuento(e) };
    this.scene.launch("Cuento", datos);
    this.scene.bringToTop("Cuento");
    this.scene.pause();
  }

  private alVolverDelCuento(e: EstadoCuerpo | null) {
    this.scene.resume();
    this.cambiando = false;
    if (e) this.ambiente(e);
    // Finishing the afternoon's last story at home brings the night.
    if (revisarHora(this.lugar)) {
      this.cambiando = true;
      this.time.delayedCall(e ? 3000 : 300, () => this.scene.restart(estado()));
      return;
    }
    this.guiar(this.make.tilemap({ key: this.lugar }).getObjectLayer("objetos")!.objects);
  }

  private ambiente(e: EstadoCuerpo) {
    const a = AMBIENTE[e];
    const { width: w, height: h } = this.scale;
    const capa = this.add.rectangle(0, 0, w, h, a.color, 0).setOrigin(0).setScrollFactor(0).setDepth(1e5 + 2);
    this.tweens.add({ targets: capa, fillAlpha: a.alfa, duration: 600, yoyo: true, hold: 1800, onComplete: () => capa.destroy() });
    if (a.zoom !== 1) this.cameras.main.zoomTo(a.zoom, 600, "Sine.easeInOut", false, (_c, t) => t === 1 && this.time.delayedCall(1800, () => this.cameras.main.zoomTo(1, 600)));
  }

  // A soft ring shows where to go next: the next story's place, or the door that leads toward it.
  // With no story left for this part of the day, it shows what moves the day on.
  private guiar(objetos: ObjetoMapa[]) {
    this.guia?.destroy();
    this.guia = null;
    const { hora } = estado();
    const c = siguiente();
    let meta: string;
    let zona: { x: number; y: number } | null = null;
    if (c && c.hora === hora) {
      const s = sitio(c.id);
      meta = s.mapa;
      if (s.zona) zona = { x: s.zona.x + s.zona.w / 2, y: s.zona.y + s.zona.h / 2 };
    } else if (hora === "manana") meta = "calle";
    else meta = "casa";
    if (meta === this.lugar) {
      if (!zona && hora === "noche" && (!c || c.hora !== hora)) {
        const cama = objetos.find((o) => o.name === "cama");
        if (cama) zona = { x: cama.x!, y: cama.y! - 16 };
      }
      if (!zona) return;
    } else {
      const puerta = this.puertaHacia(meta);
      if (!puerta) return;
      zona = { x: puerta.rect.centerX, y: puerta.rect.centerY };
    }
    this.guia = this.add.circle(zona.x, zona.y, 14).setStrokeStyle(3, 0xf2c14e).setDepth(1e5 - 1);
    this.tweens.add({ targets: this.guia, scale: 1.4, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
  }

  // First door on the shortest way from this place to another, over the doors of all maps.
  private puertaHacia(meta: string): Puerta | null {
    const puertasDe = (lugar: string): string[] =>
      ((this.cache.tilemap.get(lugar)?.data?.layers ?? []) as { name: string; objects?: ObjetoMapa[] }[])
        .find((l) => l.name === "objetos")
        ?.objects?.filter((o) => o.type === "puerta")
        .map((o) => prop(o, "destino")!) ?? [];
    const previo = new Map<string, string>();
    const cola = [this.lugar];
    const vistos = new Set(cola);
    while (cola.length) {
      const l = cola.shift()!;
      if (l === meta) break;
      for (const d of puertasDe(l))
        if (!vistos.has(d)) {
          vistos.add(d);
          previo.set(d, l);
          cola.push(d);
        }
    }
    if (!vistos.has(meta)) return null;
    let paso = meta;
    while (previo.get(paso) !== this.lugar) paso = previo.get(paso)!;
    return this.puertas.find((p) => p.destino === paso) ?? null;
  }

  // Tap the floor: walk there around walls (shortest route over the tile grid). If the spot is
  // blocked (a wall, a piece of furniture), walk to the nearest free spot instead.
  private caminarA(x: number, y: number) {
    const destino = this.libreCerca(this.muros.worldToTileXY(x, y)!);
    const origen = this.muros.worldToTileXY(this.cuerpo.center.x, this.cuerpo.center.y)!;
    if (!destino) {
      this.ruta = [];
      return;
    }
    const celdas = this.buscarRuta(origen, destino);
    this.ruta = celdas.slice(1).map((c) => new Phaser.Math.Vector2(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2));
  }

  private libreCerca(c: Celda): Celda | null {
    for (let r = 0; r <= 3; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const n = { x: c.x + dx, y: c.y + dy };
          if (this.libre(n)) return n;
        }
    return null;
  }

  private seguirRuta() {
    const body = this.cuerpo;
    while (this.ruta[0] && Phaser.Math.Distance.BetweenPoints(body.center, this.ruta[0]) < 3) this.ruta.shift();
    const siguiente = this.ruta[0];
    if (!siguiente) {
      body.setVelocity(0, 0);
      if (this.alLlegar) this.llegar();
      return;
    }
    const dir = siguiente.clone().subtract(body.center).normalize().scale(VELOCIDAD);
    body.setVelocity(dir.x, dir.y);
  }

  private libre(c: Celda) {
    const t = this.muros.getTileAt(c.x, c.y, true);
    return !!t && t.index === -1;
  }

  private buscarRuta(origen: Celda, destino: Celda): Celda[] {
    if (!this.libre(destino)) return [];
    const ancho = this.muros.layer.width;
    const clave = (c: Celda) => c.y * ancho + c.x;
    const previo = new Map<number, Celda | null>([[clave(origen), null]]);
    const cola: Celda[] = [origen];
    while (cola.length) {
      const c = cola.shift()!;
      if (c.x === destino.x && c.y === destino.y) {
        const ruta: Celda[] = [];
        for (let p: Celda | null = c; p; p = previo.get(clave(p))!) ruta.unshift(p);
        return ruta;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (!previo.has(clave(n)) && this.libre(n)) {
          previo.set(clave(n), c);
          cola.push(n);
        }
      }
    }
    return [];
  }
}
