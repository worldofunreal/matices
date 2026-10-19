// IndexedDB on the device: the saved game and the encrypted event log.
const BASE = "matices";
const VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const pedido = indexedDB.open(BASE, VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      db.createObjectStore("valores");
      db.createObjectStore("eventos", { autoIncrement: true });
    };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => mal(pedido.error);
  });
}

const db = abrir();

async function hacer<T>(almacen: string, modo: IDBTransactionMode, accion: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const t = (await db).transaction(almacen, modo);
  const pedido = accion(t.objectStore(almacen));
  return new Promise((ok, mal) => {
    t.oncomplete = () => ok(pedido.result);
    t.onerror = () => mal(t.error);
  });
}

export const leer = <T>(clave: string) => hacer<T | undefined>("valores", "readonly", (a) => a.get(clave));
export const guardar = (clave: string, valor: unknown) => hacer("valores", "readwrite", (a) => a.put(valor, clave));
export const agregarEvento = (evento: unknown) => hacer("eventos", "readwrite", (a) => a.add(evento));
export const contarEventos = () => hacer<number>("eventos", "readonly", (a) => a.count());
export const todosLosEventos = () => hacer<unknown[]>("eventos", "readonly", (a) => a.getAll());
