declare const __VERSION_JUEGO__: string;

declare module "virtual:contenido" {
  export type Opcion = [string, string];
  export interface Situacion {
    id: string;
    nombre: string;
    lugar: string;
    cuando: "correr";
    quien: "adulto_cerca";
    areas: string[];
    aviso: string;
    pregunta: string;
    respuestas: Opcion[];
  }
  const contenido: {
    version: string;
    situaciones: Situacion[];
    textos: Textos;
    figuras: { id: string; tipo: "adulto" | "menor" | "mascota"; nombre: string }[];
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
    casa: {
      inicio: string;
      instruccion: string;
      elegida: string;
      puesta: string;
      quitar: string;
      renombrar: string;
      piel: string;
      mover: string;
      cerrar: string;
      listo: string;
      cuartos: Record<string, string>;
    };
    mundo: {
      cerrado: string;
      noche: string;
      dormir: string;
      dia: string;
      fin: string;
      saludos: Record<string, string[]>;
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
