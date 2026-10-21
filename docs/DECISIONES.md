# Decisiones

Registro de cambios de dirección, con su razón. La más reciente arriba.

| Fecha | Decisión | Por qué | Quién |
| --- | --- | --- | --- |
| 2026-10-21 | Solo dos cuerpos, niña y niño; se quita "prefiero no elegir". Cada uno empieza con su look (niña: cabello largo y falda; niño: cabello corto y pantalón) y el uniforme empieza oscuro con gris. Cabello y ropa siguen libres para los dos | El cabello y la ropa ya dan esa libertad; un tercer cuerpo costaba un tercio más de arte | Omar |
| 2026-10-21 | Cada prenda, los tenis y cada extra tienen su fila de colores, como la piel y el cabello. El protagonista no tiene retrato: la creación muestra su cabeza con las mismas capas | Personalización completa sin dibujar una versión por color | Omar |
| 2026-10-20 | Fase de demo. Los participantes son anónimos y no se les pide nada; más adelante un token liga cada sesión con la identidad del niño. Los eventos van a un servidor propio en IONOS y una sola cuenta de admin ve a cada participante y a todos juntos (`tecnico/arquitectura.md`). Reemplaza las salidas de datos A, B y C | Revisar las partidas y hacer el demo | Omar |
| 2026-10-20 | El producto no pone candados, avisos ni bloqueos. Lo legal (consentimiento, sí del niño, revisión legal y de ética) lo resuelve el equipo en persona antes de entregarlo: si un niño juega, ya está resuelto. No es tema del desarrollo | Las reglas legales en los documentos frenaban el desarrollo | Omar |
| 2026-10-19 | El juego no pide el sí del niño ni muestra aviso al empezar | Pedirlo en el juego sesgaba el inicio | Omar |
| 2026-10-19 | Se quita Phaser. La interfaz se hace en React con TypeScript y CSS; el mapa del mundo, en TypeScript puro sobre un lienzo. Reemplaza la decisión del motor Phaser | Phaser dibuja letras y botones dentro del pixel art: texto pixeleado, botones pobres y una experiencia que no da la calidad buscada | Omar |
| 2026-10-19 | Reglas de experiencia: un toque elige, voz solo cuando el niño la pide, dibujos en lugar de texto, vertical y horizontal diseñados cada uno (GDD §12, §13) | El doble toque, la voz sintética y el texto en todo hacían la experiencia lenta y fea | Omar |
| 2026-10-19 | Mundo urbano moderno (escuela de dos pisos, parque con lago, biblioteca moderna) en lugar del rústico, con detalles mexicanos agregados (`arte/direccion-de-arte.md`) | Concept art nuevo de Dayana y Omar | Omar |
| 2026-10-19 | Analítica completa: el juego mide uso y técnica para el equipo, además de lo clínico; los datos llegan a un servidor propio, no a un servicio externo (PRD F16, F17) | Encontrar abandono, errores y puntos de dolor | Omar |
| 2026-10-19 | Nombre oficial: **Matices**. Se quita toda mención de "barrio"; el lugar del juego es una colonia | En México "barrio" se usa para marginar a personas de pocos recursos | Omar |
| 2026-10-19 | Dónde, cuándo, cuántas sesiones, en grupo o no, y quién revisa **no está confirmado**. El desarrollo no se basa en eso; el juego funciona igual en cualquier caso (`PRD.md`, contexto de uso) | Depende de la llamada con la directora y de cada institución | Omar |
| 2026-10-19 | Arquitectura: el juego funciona completo en el aparato, sin red; la salida de datos (archivo, estación en red local o servidor) es aparte y opcional. Reemplaza la estación en red como requisito | No se sabe si habrá red, grupo ni internet | Claude |
| 2026-10-19 | Estilo visual: pixel art de tres cuartos en una colonia de una ciudad mexicana, a partir de las referencias de Dayana, con ajustes de edad, uniforme, tonos de piel y personaje por capas | Propuesta de Dayana; los ajustes son para que niños de 8 a 12 se reconozcan | Dayana; ajustes de Claude |
| 2026-10-19 | Cambios creativos frente al GDD original (vuelve a RPG, 15 sucesos, Elena opcional, sin habilidades ni arco final, lo que se conserva): detalle y razones en `GDD.md` §3 | Observar sin dar la respuesta "correcta" y sin perder la idea creativa | Omar y Dayana; Claude |
| 2026-10-19 | 8 a 12 años, México. Escuelas o DIF: por confirmar | Decisión de producto | Omar |
| 2026-10-19 | Enfoque: el juego recoge, el psicólogo interpreta, el juego no diagnostica | Decisión de producto | Omar |

## División del trabajo

- **Omar y Dayana:** idea creativa, estilo, mundo, personajes, tono. Pueden cambiar cualquier decisión creativa.
- **Claude:** mecánicas, su protección desde el enfoque clínico, contenido de los sucesos, arquitectura y desarrollo. Cuando una idea creativa choca con la observación clínica, propone la forma de conservar la idea sin romper el dato.
- **Psicólogos:** revisan el contenido clínico (`PENDIENTES.md`).
