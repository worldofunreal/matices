// The board's calls to the event server. An answer of 401 means nobody is signed in.
import type { Evento } from "./calculos";

export async function pedir(url: string): Promise<Evento[] | "fuera"> {
  const r = await fetch(url);
  if (r.status === 401) return "fuera";
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
  return r.json();
}

export async function entrar(clave: string) {
  const r = await fetch("api/entrar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clave }) });
  return r.ok;
}

export async function salir() {
  await fetch("api/salir", { method: "POST" });
}
