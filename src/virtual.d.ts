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
    panel: Record<"cuerpo" | "pensamiento" | "entorno", Opcion[]>;
    textos: Textos;
  };
  interface Textos {
    asentimiento: { texto: string; si: string; no: string; psicologo_prueba: string };
    creacion: {
      inicio: string;
      espejo: string;
      listo: string;
      pasos: Record<"cuerpo" | "piel" | "cabello" | "color_cabello" | "ropa" | "extras" | "color_mochila" | "nombre", string>;
      cuerpo: Record<"nina" | "nino" | "neutro", string>;
      ropa: Record<"uniforme_pantalon" | "uniforme_falda" | "casa", string>;
      extras: Record<"lentes" | "aretes" | "gorra" | "mochila", string>;
      piel: string;
      color_cabello: string;
      color_mochila: string;
      escribir_nombre: string;
      nombres: string[];
    };
  }
  export default contenido;
}

declare module "virtual:arte" {
  type Rampa = "piel" | "cabello" | "mochila";
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
    voces: string[];
  };
  export default arte;
}
