declare const __VERSION_JUEGO__: string;

declare module "virtual:contenido" {
  // One line of a scene: someone speaks, the child chooses, a minigame runs, a mark is set, a mission shows.
  // Options are [code, text, answer]; the answer is null when it comes later in the scene.
  export type Paso = {
    de?: string;
    texto?: string;
    opciones?: [string, string, string | null][];
    marca?: string;
    mision?: string;
    minijuego?: string;
    efecto?: string;
  };
  export interface Escena {
    id: string;
    nombre: string;
    donde: string;
    al: string;
    dia?: number;
    hora?: "manana" | "tarde" | "noche";
    tras?: string | string[];
    si?: string[];
    no?: string[];
    areas?: string[];
    delicada?: boolean;
    saltable?: boolean;
    pasos: Paso[];
  }
  const contenido: {
    version: string;
    escenas: Escena[];
    textos: Textos;
    figuras: { id: string; tipo: "adulto"; nombre: string }[];
    lugares: string[];
    conexiones: Record<string, string[]>;
    areas: { id: string; nombre: string; familia: string }[];
    objetos: Record<string, string[]>;
  };
  interface Textos {
    creacion: {
      inicio: string;
      espejo: string;
      listo: string;
      siguiente: string;
      atras: string;
      pasos: Record<"cuerpo" | "piel" | "cabello" | "color_cabello" | "ropa" | "extras" | "color_mochila" | "nombre", string>;
      cuerpo: Record<"nina" | "nino", string>;
      ropa: Record<"uniforme_pantalon" | "uniforme_falda" | "casa", string>;
      extras: Record<"lentes" | "aretes" | "gorra" | "mochila", string>;
      color_de: Record<string, string>;
      piel: string;
      color_cabello: string;
      color_mochila: string;
      escribir_nombre: string;
      nombres: string[];
    };
    escena: {
      hablantes: Record<string, string>;
      seguir: string;
      saltar: string;
      pausar: string;
      mision: string;
    };
    mundo: {
      cerrado: string;
      noche: string;
      dormir: string;
      dia: string;
      fin: string;
      saludos: Record<string, string[]>;
      nombres: Record<string, string>;
      objetos: Record<string, Record<string, string>>;
      correr: string;
      a_dormir: string;
      lugares: Record<string, string>;
      lugares_dentro: Record<string, string>;
    };
    libro: { titulo: string; dibujar: string; consigna: string; listo: string };
    siempre: { mi_libro: string; quiero_hablar: string; opciones: string; aviso: string; seguir: string };
    opciones: {
      titulo: string;
      cerrar: string;
      voz: string;
      musica: string;
      efectos: string;
      velocidad: string;
      velocidades: string[];
      lectura: string;
      prendido: string;
      apagado: string;
      bajar: string;
      subir: string;
    };
  }
  export default contenido;
}

declare module "virtual:arte" {
  type Rampa = import("../herramientas/arte.ts").Rampa;
  interface Pieza {
    id: string;
    archivo: string;
    tipo: "hoja" | "fondo" | "objeto";
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
