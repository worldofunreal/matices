# Contenido

Texto de las escenas y del resto del juego. El juego lee estos archivos tal cual; los psicólogos los revisan aquí. Versión del contenido: `0.4.0` (borrador, sin revisión clínica).

| Archivo | Qué es |
| --- | --- |
| `escenas.yaml` | Las escenas del demo (guion de Dayana): dónde y cuándo empiezan, sus líneas, opciones, minijuegos y marcas |
| `figuras.yaml` | La familia que aparece en la casa (mamá, papá, tío) |
| `textos.yaml` | Textos fijos: creación de personaje, los 40 nombres, cuadro de diálogo, mundo, letreros de las salidas |
| `codigos.md` | Los códigos de las opciones y los eventos que guarda el juego |
| `areas.md` | Las áreas de las escenas |

## Forma de una escena

```yaml
- id: T05                              # único: letras, números y guion
  nombre: Conversación con la madre    # solo para el tablero
  donde: casa                          # un mapa de public/mapas/
  al: mesa                             # entrar | salir:<lugar> | un objeto o persona de ese mapa
  dia: 1                               # 1 a 3
  hora: manana                         # manana | tarde | noche
  tras: T03                            # opcional: una escena o una lista (cualquiera de ellas)
  si: [ropa_deporte]                   # opcional: marcas que tienen que estar
  no: [ropa_deporte]                   # opcional: marcas que no pueden estar
  areas: [pedir_ayuda]                 # opcional
  delicada: true                       # opcional: siempre con saltable
  saltable: true                       # se puede saltar
  pasos:
    - {de: madre, texto: "¡Buenos días! Ya despertaste."}
    - opciones:                        # de 2 a 4; cada una: [CÓDIGO, texto, respuesta o null]
        - [ACEPTA, "Está bien, mamá.", "Gracias. Nos vemos más tarde."]
        - [PIDE_AYUDA, "¿Podrías ayudarme?", null]
    - {minijuego: refri}               # refri, estufa, ropero, cuerda, dibujo, pistas, examen, tienda
    - {marca: conocio_valeria}         # una marca que otras escenas pueden pedir con si y no
    - {mision: "Buscar algo para desayunar"}
    - {de: sistema, texto: "Has conocido mejor a Valeria."}
```

Cada paso hace una sola cosa: una línea (`de`), unas opciones, un minijuego, una marca, una misión o un efecto (`inquietud`, `miedo`, `intensidad`, `acompanamiento` o `alegria`; la intensidad la gradúa Efectos en Opciones).

Una salida (`al: salir:<lugar>`) puede llevar `frena: true`. Entonces la puerta retiene al niño con el recordatorio de la escena la primera vez que intenta salir. Cada escena de salida se da una sola vez: al volver a intentarlo, pasa a la siguiente escena o sale.

## Pendientes

Lo que el niño puede dejar sin hacer se declara en `pendientes:`, al final de `escenas.yaml`:

```yaml
pendientes:
  - id: apagar-estufa                  # único
    abre: estufa_prendida              # la marca que lo abre
    cierra: estufa_apagada             # la marca que lo cierra
    lugar: casa                        # solo cuenta mientras el niño está aquí
    objeto: estufa                     # lo que toca el niño para cerrarlo
    etiqueta: Estufa                   # el nombre en la guía amarilla
    mision: "Apagar la estufa"         # el letrero de arriba mientras está abierto
```

Mientras está abierto y el niño está en ese lugar, el letrero y la guía lo muestran primero. El validador exige que una escena de ese objeto dé la marca de cierre, para que ningún pendiente quede sin salida.

## Reglas

- Toda opción lleva un código de `codigos.md`. Una opción sin código o con un código que no existe rompe la compilación.
- Una escena `delicada` siempre es `saltable`: el niño puede pausarla, saltarla y pedir ayuda en cualquier momento.
- Las respuestas (`null` o texto) solo van cuando quien responde ya habló antes en la escena.
- Un género no se escribe fijo. Donde una palabra cambia con el cuerpo del niño se escribe con la marca `{o}`: `list{o}` sale "listo" o "lista". Sin otras marcas en el texto.
- Textos para secundaria, en español de México, sin violencia explícita, sin groserías. Puede ser ruda en el tono, nunca grosera en las palabras.
- Cambiar un texto sube la versión del contenido; los reportes guardan la versión que vio cada niño.
