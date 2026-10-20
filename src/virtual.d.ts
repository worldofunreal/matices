declare const __VERSION_JUEGO__: string;

declare module "virtual:contenido" {
  export type Opcion = [string, string];
  export interface Paso {
    id: string;
    pregunta?: string;
    personas?: string[];
    opciones?: Opcion[];
    opciones_solo?: Opcion[];
    solo_si?: string[];
  }
  export interface Cuento {
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
    escena: {
      id: string;
      imagen: string;
      pregunta_titulo: string;
      titulos: Opcion[];
      pregunta_emocion: string;
      emociones: string[];
      pregunta_platos: string;
      platos: string[];
    };
    panel: Record<"cuerpo" | "pensamiento" | "entorno", Opcion[]>;
    textos: Textos;
    figuras: { id: string; tipo: "adulto" | "menor" | "mascota"; nombre: string }[];
    lugares: string[];
    conexiones: Record<string, string[]>;
    sitios: Record<string, { mapa: string; zona: { x: number; y: number; w: number; h: number } | null }>;
    actividades: { id: string; tipo: TipoActividad; dia: 1 | 2 | 3; hora: "manana" | "tarde" | "noche"; lugar: string }[];
    areas: { id: string; nombre: string; familia: string }[];
    objetos: Record<string, string[]>;
  };
  export type TipoActividad = "cuentera" | "dibujo" | "describir" | "sobre_mi";
  interface Textos {
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
      salida: string;
      sin_sueno: string;
    };
    cuento: {
      inicio: string;
      pregunta: string;
      cierre: string;
      ahora_no: string;
      boton_ahora_no: string;
      otra: string;
      no_se: string;
      nadie: string;
      solo: string;
      vecino: string;
      escuela: Record<"maestra" | "companero" | "conserje" | "directora", string>;
      carita: string;
      caritas: string[];
      contar_mas: string;
      panel: Record<"cuerpo" | "pensamiento" | "entorno", string>;
      estado: string;
      estados: Record<"tranquilo" | "inquieto" | "alerta" | "saturado", string>;
      listo: string;
      dibujar: string;
    };
    actividades: {
      cuentera: string[];
      dibujo_libre: string;
      describir: { inicio: string; emociones: Record<string, string> };
      sobre_mi: { los_dos: string; ahora_no: string; fin: string };
      seguir: string;
      aterrizaje: { texto: string; adios: string; adios_final: string };
    };
    siempre: { mi_libro: string; quiero_hablar: string; opciones: string; aviso: string; seguir: string };
    opciones: {
      titulo: string;
      cerrar: string;
      voz: string;
      musica: string;
      efectos: string;
      velocidad: string;
      velocidades: string[];
      ambiente: string;
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
