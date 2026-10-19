import Phaser from "phaser";

const VELOCIDAD = 90;
const TILE = 32;

type Celda = { x: number; y: number };

// One explorable place, loaded from a Tiled map with layers `piso`, `muros` and `objetos`.
export class Mundo extends Phaser.Scene {
  private prota!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private muros!: Phaser.Tilemaps.TilemapLayer;
  private teclas!: Record<"arriba" | "abajo" | "izq" | "der", Phaser.Input.Keyboard.Key[]>;
  private ruta: Phaser.Math.Vector2[] = [];

  constructor() {
    super("Mundo");
  }

  create(datos: { mapa: string }) {
    const mapa = this.make.tilemap({ key: datos.mapa });
    const tiles = mapa.addTilesetImage("provisional", "provisional")!;
    mapa.createLayer("piso", tiles)!;
    this.muros = mapa.createLayer("muros", tiles)!;
    this.muros.setCollisionByExclusion([-1]);

    const inicio = mapa.findObject("objetos", (o) => o.name === "inicio")!;
    this.prota = this.physics.add.sprite(inicio.x!, inicio.y!, "prota").setOrigin(0.5, 1);
    this.prota.body.setSize(20, 12).setOffset(6, 36);
    this.prota.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, mapa.widthInPixels, mapa.heightInPixels);
    this.physics.add.collider(this.prota, this.muros);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, mapa.widthInPixels, mapa.heightInPixels);
    cam.startFollow(this.prota, true);

    const k = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = {
      arriba: [k.addKey(K.UP), k.addKey(K.W)],
      abajo: [k.addKey(K.DOWN), k.addKey(K.S)],
      izq: [k.addKey(K.LEFT), k.addKey(K.A)],
      der: [k.addKey(K.RIGHT), k.addKey(K.D)],
    };

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.caminarA(p.worldX, p.worldY));

    if (this.physics.world.drawDebug) {
      this.muros.renderDebug(this.add.graphics().setAlpha(0.5), { tileColor: null });
      for (const o of mapa.getObjectLayer("objetos")!.objects)
        this.add.text(o.x!, o.y!, o.name, { fontSize: "8px", color: "#000" }).setOrigin(0.5).setDepth(1e6);
    }
  }

  update() {
    const v = new Phaser.Math.Vector2(
      Number(this.teclas.der.some((t) => t.isDown)) - Number(this.teclas.izq.some((t) => t.isDown)),
      Number(this.teclas.abajo.some((t) => t.isDown)) - Number(this.teclas.arriba.some((t) => t.isDown)),
    );
    if (v.lengthSq() > 0) {
      this.ruta = [];
      this.prota.body.setVelocity(v.x, v.y).velocity.normalize().scale(VELOCIDAD);
    } else {
      this.seguirRuta();
    }
    this.prota.setDepth(this.prota.y);
  }

  // Tap the floor: walk there around walls (shortest route over the tile grid).
  private caminarA(x: number, y: number) {
    const destino = this.muros.worldToTileXY(x, y)!;
    const origen = this.muros.worldToTileXY(this.prota.body.center.x, this.prota.body.center.y)!;
    const celdas = this.buscarRuta(origen, destino);
    this.ruta = celdas.slice(1).map((c) => new Phaser.Math.Vector2(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2));
  }

  private seguirRuta() {
    const body = this.prota.body;
    while (this.ruta[0] && Phaser.Math.Distance.BetweenPoints(body.center, this.ruta[0]) < 3) this.ruta.shift();
    const siguiente = this.ruta[0];
    if (!siguiente) {
      body.setVelocity(0, 0);
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
