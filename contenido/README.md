# Contenido

Texto de las escenas y del resto del juego. El juego lee estos archivos tal cual; los psicólogos los revisan aquí. Versión del contenido: `0.5.0` (borrador, sin revisión clínica).

| Archivo | Qué es |
| --- | --- |
| `escenas.yaml` | Las escenas del demo (guion de Dayana): dónde y cuándo empiezan, sus líneas, opciones, minijuegos y marcas |
| `figuras.yaml` | La familia que aparece en la casa (mamá, papá, tío). Con `x` e `y` tiene su sitio en el mapa de la casa; sin sitio no aparece allí |
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
  tras: T03                            # opcional: una escena o una lista; el juego anuncia la espera (nunca en la cama)
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
    - {de: sistema, titulo: "Alarma escolar", texto: "Es hora de ponerte el uniforme en tu cuarto."}
```

Cada paso hace una sola cosa: una línea (`de`), unas opciones, un minijuego, una marca o un efecto (`inquietud`, `miedo`, `intensidad`, `acompanamiento` o `alegria`; la intensidad la gradúa Efectos en Opciones).

Una salida (`al: salir:<lugar>`) con `frena: true` es el recordatorio de un pendiente: su `si:` pide la marca que lo abre. Aparece una sola vez: al aparecer queda visto, y el siguiente intento sale.

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

Mientras está abierto y el niño está en ese lugar, el letrero y la guía lo muestran primero. El validador exige que una escena de ese objeto dé la marca de cierre, para que ningún pendiente quede sin salida. Y necesita su consecuencia: una escena de llegada (`al: entrar`) en ese lugar que pide la marca que lo abre.

## Objetivos

Los objetivos del día van en `hitos:`, al final de `escenas.yaml`, en orden. El juego muestra el primero que no se ha cumplido. Solo nombran lugares y rutinas: nunca una persona ni una escena emocional (regla 12 de `docs/metodologia.md`).

```yaml
hitos:
  - { dia: 1, hora: manana, lugar: casa, objeto: refrigerador, mision: Sacar los huevos del refrigerador, etiqueta: Refrigerador, cumple: [T06] }
  - { dia: 1, hora: manana, lugar: casa, puertaDestino: calle, mision: Salir de casa rumbo a la escuela, etiqueta: Salir a la calle, cumple: [T09] }
```

- `dia`, `hora` y `lugar`: cuándo y dónde vale el objetivo.
- `objeto`, o `puertaDestino` (la puerta que lleva a otro lugar): a qué apunta la guía. Debe existir en el mapa.
- `mision`: el letrero de arriba. `etiqueta`: el nombre en la guía.
- `cumple`: una o más escenas. Basta con que una esté hecha. Un objetivo sin `cumple` dura hasta que cambie la parte del día, así que va al final de su bloque.

## Reglas

- Toda opción lleva un código de `codigos.md`. Una opción sin código o con un código que no existe rompe la compilación.
- Una escena `delicada` siempre es `saltable`: el niño puede saltarla y pedir ayuda en cualquier momento. Las reglas de pausa están en `docs/diseno.md`.
- Una espera que el juego anuncia (`tras`) nunca va en la cama: impediría dormir. Para esperar sin anunciarlo, usa `si:` con una marca. El validador lo rechaza.
- Las respuestas (`null` o texto) solo van cuando quien responde ya habló antes en la escena.
- `sistema` es solo para instrucciones del juego; lo que pasa en la historia va como `pensamiento` o como línea de alguien. Cada voz se ve distinta en pantalla, y no se repite con una línea lo que el jugador acaba de hacer.
- Solo una línea de `sistema` lleva `titulo`; las opciones también pueden llevarlo. El validador rechaza un título en una línea de la historia.
- Un género no se escribe fijo. Donde una palabra cambia con el cuerpo del niño se escribe con la marca `{o}`: `list{o}` sale "listo" o "lista". Sin otras marcas en el texto.
- Una marca `vigila_<nombre>` (el nombre de la persona o del animal, como en el mapa; por ejemplo `vigila_vecino_1`) hace vigilante a esa persona o animal mientras la marca esté: se voltea hacia el niño según de qué lado esté. Quiénes son vigilantes sin marca están en `src/mundo/vigilancia.ts`.
- Textos para secundaria, en español de México, sin violencia explícita, sin groserías. Puede ser ruda en el tono, nunca grosera en las palabras.
- Cambiar un texto sube la versión del contenido; los reportes guardan la versión que vio cada niño.
