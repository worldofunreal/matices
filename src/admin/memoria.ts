// What the board remembers in this browser and nowhere else: the educator's name and role, and the
// participants already shown. If the browser refuses to store, the error is logged and the board keeps working.

export interface Educadora {
  nombre: string;
  cargo: string;
}

const CLAVE_EDUCADORA = "matices.educadora";
const CLAVE_VISTOS = "matices.vistos";

function leer(clave: string): unknown {
  try {
    const texto = localStorage.getItem(clave);
    return texto === null ? null : JSON.parse(texto);
  } catch (error) {
    console.error(`No se pudo leer ${clave} en este navegador.`, error);
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.error(`No se pudo guardar ${clave} en este navegador.`, error);
    return false;
  }
}

export function educadoraGuardada(): Educadora {
  const guardada = leer(CLAVE_EDUCADORA) as Partial<Educadora> | null;
  return { nombre: typeof guardada?.nombre === "string" ? guardada.nombre : "", cargo: typeof guardada?.cargo === "string" ? guardada.cargo : "" };
}

export const guardarEducadora = (educadora: Educadora) => escribir(CLAVE_EDUCADORA, educadora);

// The codes already shown; null on the first visit, when nobody counts as new yet.
export function vistosGuardados(): string[] | null {
  const vistos = leer(CLAVE_VISTOS);
  return Array.isArray(vistos) ? vistos.filter((v): v is string => typeof v === "string") : null;
}

export const guardarVistos = (codigos: string[]) => escribir(CLAVE_VISTOS, codigos);
