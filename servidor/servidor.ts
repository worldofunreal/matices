// Event server and admin API. One file, Node 24, no libraries.
//   node servidor/servidor.ts --dev       local: admin password "admin", database in servidor/dev.sqlite
//   node servidor/servidor.ts --hash <c>  prints MATICES_CLAVE_HASH for a password
// In production it reads MATICES_PUERTO, MATICES_BASE, MATICES_CLAVE_HASH and MATICES_SECRETO, and refuses to start without them.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const hashDe = (clave: string, sal = randomBytes(16).toString("hex")) => `${sal}:${scryptSync(clave, sal, 32).toString("hex")}`;

const i = process.argv.indexOf("--hash");
if (i > 0) {
  console.log(hashDe(process.argv[i + 1] ?? ""));
  process.exit(0);
}

const dev = process.argv.includes("--dev");
const PUERTO = Number(process.env.MATICES_PUERTO ?? 3200);
const BASE = process.env.MATICES_BASE ?? (dev ? "servidor/dev.sqlite" : "");
const CLAVE = process.env.MATICES_CLAVE_HASH ?? (dev ? hashDe("admin") : "");
const SECRETO = process.env.MATICES_SECRETO ?? (dev ? "dev" : "");
if (!BASE || !CLAVE || !SECRETO) {
  console.error("Faltan MATICES_BASE, MATICES_CLAVE_HASH o MATICES_SECRETO (o usa --dev).");
  process.exit(1);
}

const TOPE = 4 * 2 ** 20; // drawings travel as images
const DIAS_SESION = 7;

const db = new DatabaseSync(BASE);
db.exec(`CREATE TABLE IF NOT EXISTS eventos (
  nino TEXT NOT NULL, id INTEGER NOT NULL, tipo TEXT NOT NULL, recibido INTEGER NOT NULL, datos TEXT NOT NULL,
  PRIMARY KEY (nino, id))`);
// Sending the same event twice keeps one: the device numbers its events.
const insertar = db.prepare("INSERT OR IGNORE INTO eventos VALUES (?, ?, ?, ?, ?)");
// The list for "all" leaves out the drawings' image and strokes; a participant's profile gets everything.
const todos = db.prepare("SELECT CASE WHEN tipo = 'dibujo' THEN json_remove(datos, '$.imagen', '$.trazos') ELSE datos END AS d FROM eventos ORDER BY nino, id");
const deUno = db.prepare("SELECT datos AS d FROM eventos WHERE nino = ? ORDER BY id");

const firma = (exp: number) => createHmac("sha256", SECRETO).update(String(exp)).digest("hex");
function adentro(pedido: IncomingMessage) {
  const galleta = /(?:^|;\s*)matices=(\d+)\.([0-9a-f]+)/.exec(pedido.headers.cookie ?? "");
  if (!galleta || Number(galleta[1]) < Date.now()) return false;
  const a = Buffer.from(galleta[2]), b = Buffer.from(firma(Number(galleta[1])));
  return a.length === b.length && timingSafeEqual(a, b);
}
function claveCorrecta(clave: string) {
  const [sal, hash] = CLAVE.split(":");
  const a = Buffer.from(hash, "hex"), b = scryptSync(clave, sal, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cuerpo(pedido: IncomingMessage): Promise<string | null> {
  return new Promise((ok) => {
    let n = 0;
    const partes: Buffer[] = [];
    pedido.on("data", (p: Buffer) => {
      n += p.length;
      if (n > TOPE) {
        ok(null);
        pedido.destroy();
      } else partes.push(p);
    });
    pedido.on("end", () => ok(Buffer.concat(partes).toString("utf8")));
  });
}

const responder = (r: ServerResponse, codigo: number, datos: string = "{}", extra: Record<string, string> = {}) => {
  r.writeHead(codigo, { "content-type": "application/json", "cache-control": "no-store", ...extra });
  r.end(datos);
};

const valido = (e: unknown): e is { nino: string; id: number; tipo: string } => {
  const x = e as Record<string, unknown>;
  return !!x && typeof x.nino === "string" && x.nino.length <= 40 && Number.isInteger(x.id) && typeof x.tipo === "string" && x.tipo.length <= 40;
};

createServer(async (pedido, r) => {
  const url = new URL(pedido.url ?? "/", "http://x");
  const ruta = `${pedido.method} ${url.pathname}`;
  try {
    if (ruta === "GET /api/salud") return responder(r, 200, '{"ok":true}');

    if (ruta === "POST /api/eventos") {
      const texto = await cuerpo(pedido);
      if (texto === null) return responder(r, 413);
      const lista: unknown = JSON.parse(texto);
      if (!Array.isArray(lista) || !lista.every(valido)) return responder(r, 400);
      const ahora = Date.now();
      db.exec("BEGIN");
      for (const e of lista) insertar.run(e.nino, e.id, e.tipo, ahora, JSON.stringify(e));
      db.exec("COMMIT");
      return responder(r, 200);
    }

    if (ruta === "POST /api/entrar") {
      const { clave } = JSON.parse((await cuerpo(pedido)) ?? "{}") as { clave?: string };
      if (typeof clave !== "string" || !claveCorrecta(clave)) return responder(r, 401);
      const exp = Date.now() + DIAS_SESION * 864e5;
      return responder(r, 200, "{}", { "set-cookie": `matices=${exp}.${firma(exp)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${DIAS_SESION * 86400}${dev ? "" : "; Secure"}` });
    }
    if (ruta === "POST /api/salir") return responder(r, 200, "{}", { "set-cookie": "matices=; Path=/api; Max-Age=0" });

    if (ruta === "GET /api/admin/eventos") {
      if (!adentro(pedido)) return responder(r, 401);
      // ponytail: every event goes to the browser, which builds the summaries; summarize here when it gets slow.
      const nino = url.searchParams.get("nino");
      const filas = (nino ? deUno.all(nino) : todos.all()) as { d: string }[];
      return responder(r, 200, `[${filas.map((f) => f.d).join(",")}]`);
    }

    responder(r, 404);
  } catch (e) {
    console.error(ruta, e);
    if (db.isTransaction) db.exec("ROLLBACK");
    if (!r.headersSent) responder(r, e instanceof SyntaxError ? 400 : 500);
  }
}).listen(PUERTO, "127.0.0.1", () => console.log(`matices: http://127.0.0.1:${PUERTO}${dev ? " (dev, clave admin)" : ""}`));
