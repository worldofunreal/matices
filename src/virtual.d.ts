declare const __VERSION_JUEGO__: string;

declare module "virtual:contenido" {
  type Opcion = [string, string];
  interface Paso {
    id: string;
    pregunta?: string;
    personas?: string[];
    opciones?: Opcion[];
    opciones_solo?: Opcion[];
    solo_si?: string[];
  }
  interface Cuento {
    id: string;
    titulo: string;
    dia: 1 | 2 | 3;
    intensidad: "baja" | "media";
    lugar: string;
    hora: "manana" | "tarde" | "noche";
    area_principal: string;
    areas: string[];
    inicio: string;
    pasos: Paso[];
  }
  const contenido: {
    version: string;
    cuentos: Cuento[];
    sobreMi: { aviso: string; frases: { id: string; area: string; a: string; b: string }[] };
    escena: Record<string, unknown>;
  };
  export default contenido;
}

declare module "virtual:arte" {
  type Rampa = "piel" | "cabello";
  interface Pieza {
    id: string;
    archivo: string;
    tipo: "hoja" | "retrato" | "fondo" | "objeto" | "marco" | "tarjeta" | "boton" | "icono" | "ilustracion";
    medida: [number, number];
    que: string;
    colores: Rampa[];
  }
  const arte: {
    colores: Record<Rampa, { clave: string[]; variantes: string[][] }>;
    piezas: Pieza[];
  };
  export default arte;
}
