declare const __VERSION_JUEGO__: string;

declare module "virtual:contenido" {
  // One line of a scene: someone speaks, the child chooses, a minigame runs, a mark is set, an effect shows.
  // Options are [code, text, answer]; the answer is null when it comes later in the scene. A fourth "cierra": the scene ends after the answer.
  export type Paso = {
    de?: string;
    titulo?: string;
    texto?: string;
    opciones?: [string, string, string | null, "cierra"?][];
    marca?: string;
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
    frena?: boolean;
    sugerida?: boolean;
    ensena?: "salto";
    pasos: Paso[];
  }
  // A pending thing the child can leave undone: a mark opens it and another closes it (contenido/escenas.yaml).
  export interface Pendiente {
    id: string;
    abre: string;
    cierra: string;
    lugar: string;
    objeto: string;
    etiqueta: string;
    mision: string;
  }
  // An objective of the day, in order (contenido/escenas.yaml, hitos): the first one not done is the goal.
  export interface Hito {
    dia: number;
    hora: "manana" | "tarde" | "noche";
    lugar: string;
    objeto?: string;
    puertaDestino?: string;
    mision: string;
    etiqueta: string;
    cumple?: string | string[];
  }
  const contenido: {
    version: string;
    escenas: Escena[];
    pendientes: Pendiente[];
    hitos: Hito[];
    textos: Textos;
    figuras: { id: string; tipo: "adulto"; nombre: string; casa?: { x: number; y: number } }[];
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
      pasos: Record<"cuerpo" | "piel" | "cabello" | "color_cabello" | "ropa" | "extras" | "color_mochila" | "cuarto" | "nombre", string>;
      cuerpo: Record<"nina" | "nino", string>;
      ropa: Record<"uniforme_pantalon" | "uniforme_falda" | "casa", string>;
      extras: Record<"lentes" | "aretes" | "gorra" | "mochila", string>;
      color_de: Record<string, string>;
      piel: string;
      color_cabello: string;
      color_mochila: string;
      muebles: Record<string, string>;
      color_original: string;
      escribir_nombre: string;
      nombres: string[];
    };
    escena: {
      hablantes: Record<string, string>;
      seguir: string;
      omitir: string;
      pausar: string;
      seguir_despues: string;
      mision: string;
    };
    mundo: {
      cerrado: string;
      noche: string;
      dormir: string;
      dia: string;
      fin: string;
      ensena_salto: string;
      saludos: Record<string, string[]>;
      nombres: Record<string, string>;
      objetos: Record<string, Record<string, string>>;
      correr: string;
      a_dormir: string;
      lugares: Record<string, string>;
      lugares_dentro: Record<string, string>;
    };
    portada: { continuar: string; cambiar: string };
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
      personaje: string;
      cambiar: string;
      partida: string;
      empezar: string;
      empezar_aviso: string;
      empezar_si: string;
      empezar_no: string;
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
