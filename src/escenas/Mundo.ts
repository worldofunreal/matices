import Phaser from "phaser";
import { Protagonista } from "../personaje/Protagonista";
import { variante } from "../arte";
import { cambiarEstado, type Estado } from "../datos/guardado";

const VELOCIDAD = 90;
const TILE = 32;

type Celda = { x: number; y: number };

// One explorable place: the art is lugares/<lugar>/fondo.png; walls and points come from the
// Tiled map public/mapas/<lugar>.json (layers `muros` and `objetos`).
export class Mundo extends Phaser.Scene {
  private prota!: Protagonista;
  private cuerpo!: Phaser.Physics.Arcade.Body;
  private muros!: Phaser.Tilemaps.TilemapLayer;
  private teclas!: Record<"arriba" | "abajo" | "izq" | "der", Phaser.Input.Keyboard.Key[]>;
  private ruta: Phaser.Math.Vector2[] = [];
  private alLlegar: (() => void) | null = null;

  constructor() {
    super("Mundo");
  }

  create(estado: Estado) {
    const mapa = this.make.tilemap({ key: estado.lugar });
    this.add.image(0, 0, `lugares/${estado.lugar}/fondo`).setOrigin(0).setDepth(-1);
    const rejilla = mapa.addTilesetImage("provisional", "rejilla")!;
    this.muros = mapa.createLayer("muros", rejilla)!.setVisible(this.physics.world.drawDebug);
    this.muros.setCollisionByExclusion([-1]);

    const inicio = mapa.findObject("objetos", (o) => o.name === "inicio")!;
    this.prota = new Protagonista(this, estado.x ?? inicio.x!, estado.y ?? inicio.y!, estado.apariencia);
    this.prota.direccion = estado.direccion;
    this.physics.add.existing(this.prota);
    this.cuerpo = this.prota.body as Phaser.Physics.Arcade.Body;
    this.cuerpo.setSize(20, 12).setOffset(-10, -12);
    this.cuerpo.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, mapa.widthInPixels, mapa.heightInPixels);
    this.physics.add.collider(this.prota, this.muros);

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

    this.colocarObjetos(mapa, estado.lugar);
    // The people the child put in the house stand where they were placed.
    if (estado.lugar === "casa")
      for (const f of estado.casa) this.add.sprite(f.x, f.y, variante(this, `figuras/${f.figura}`, { piel: f.piel }), 0).setOrigin(0.5, 1).setDepth(f.y);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, encima: Phaser.GameObjects.GameObject[]) => {
      if (encima.length) return; // tapped an object; it handles itself
      this.alLlegar = null;
      this.caminarA(p.worldX, p.worldY);
    });

    if (this.physics.world.drawDebug) {
      this.muros.renderDebug(this.add.graphics().setAlpha(0.5), { tileColor: null });
      for (const o of mapa.getObjectLayer("objetos")!.objects)
        this.add.text(o.x!, o.y!, o.name, { fontSize: "8px", color: "#000" }).setOrigin(0.5).setDepth(1e6);
    }
  }

  // Points of type "objeto" with art in lugares/<lugar>/<name>.png are drawn there, feet on the point.
  // Tapping one walks next to it and then acts.
  private colocarObjetos(mapa: Phaser.Tilemaps.Tilemap, lugar: string) {
    for (const o of mapa.getObjectLayer("objetos")!.objects) {
      const clave = `lugares/${lugar}/${o.name}`;
      if (o.type !== "objeto" || !this.textures.exists(clave)) continue;
      const img = this.add.image(o.x!, o.y!, clave).setOrigin(0.5, 1).setDepth(o.y!).setInteractive({ useHandCursor: true });
      img.on("pointerdown", () => {
        this.alLlegar = () => this.usar(o.name);
        this.caminarA(o.x!, o.y! + TILE / 2);
        if (!this.ruta.length) this.llegar();
      });
    }
  }

  private usar(objeto: string) {
    if (objeto === "espejo") this.scene.start("Creacion", { modo: "espejo" });
  }

  private llegar() {
    const accion = this.alLlegar;
    this.alLlegar = null;
    accion?.();
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
    const v = new Phaser.Math.Vector2(
      Number(this.teclas.der.some((t) => t.isDown)) - Number(this.teclas.izq.some((t) => t.isDown)),
      Number(this.teclas.abajo.some((t) => t.isDown)) - Number(this.teclas.arriba.some((t) => t.isDown)),
    );
    if (v.lengthSq() > 0) {
      this.ruta = [];
      this.cuerpo.setVelocity(v.x, v.y).velocity.normalize().scale(VELOCIDAD);
    } else {
      this.seguirRuta();
    }
    this.prota.mover(this.cuerpo.velocity.x, this.cuerpo.velocity.y);
    this.prota.setDepth(this.prota.y);
    cambiarEstado({ x: Math.round(this.prota.x), y: Math.round(this.prota.y), direccion: this.prota.direccion });
  }

  // Tap the floor: walk there around walls (shortest route over the tile grid).
  private caminarA(x: number, y: number) {
    const destino = this.muros.worldToTileXY(x, y)!;
    const origen = this.muros.worldToTileXY(this.cuerpo.center.x, this.cuerpo.center.y)!;
    const celdas = this.buscarRuta(origen, destino);
    this.ruta = celdas.slice(1).map((c) => new Phaser.Math.Vector2(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2));
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
