# MVP · El juego completo con arte provisional

> El MVP es el bucle completo del juego (GDD) jugable de principio a fin con arte provisional. El arte final entra después reemplazando archivos en `public/assets/`, sin tocar código (`arte/direccion-de-arte.md`). Cada hito se publica en https://matices.online y se revisa ahí.

## Hitos

| Hito | Qué incluye | Listo cuando |
| --- | --- | --- |
| H1. Base | Carpeta de arte con un archivo provisional por cada pieza; el juego carga todo desde la lista de arte; colores de piel y cabello desde la paleta; guardado y regreso; registro de eventos cifrado en el aparato | Se reemplaza un PNG provisional por otro del mismo tamaño y el juego lo muestra sin cambiar código; se cierra el juego a la mitad y regresa donde estaba |
| H2. Inicio y personaje | Sí del niño, creación de personaje (GDD §6), espejo en la casa | Se arma un personaje con cualquier combinación y se ve igual caminando y en su retrato |
| H3. Armar la casa | Figuras a los cuartos, renombrar, quitar (GDD §7) | Las figuras que se pusieron son las que aparecen en "¿Quién llega?" |
| H4. Mundo | Casa, calle, escuela (dos plantas), parque, tiendita, biblioteca; puertas; mañana, tarde y noche; vecinos que saludan; objetos que se tocan | Se recorren los tres días sin sucesos, de la casa a cada lugar y de regreso |
| H5. Modo cuento | Los 15 sucesos desde `contenido/`, tarjetas con voz, "Ahora no", "Volver a escuchar", "Otra cosa" con dibujo, "No sé", caritas, panel cuerpo / pensamiento / entorno, estados del cuerpo, página en Mi libro | Cada suceso se juega de punta a punta y cada paso deja su evento |
| H6. Actividades | Dibujo libre, escena para describir, Sobre mí con Tito y Tita, calma y aterrizaje | Los tres días se juegan completos |
| H7. Siempre a la mano | "Quiero hablar con alguien", Mi libro, opciones (GDD §13, §15) | Se alcanzan desde cualquier pantalla con una mano |
| H8. Datos | Archivo cifrado para el psicólogo (modo A); servidor propio de analítica y tablero del equipo (PRD F16, F17) | Un psicólogo abre el archivo de una partida; el tablero muestra abandono, tiempos y errores de las partidas de prueba |
| H9. Plataformas | Android e iOS (Capacitor), Windows, macOS y Linux (Tauri) | El juego se instala y juega sin red en cada una |

La voz usa la voz del navegador hasta que haya grabaciones; una grabación en `public/assets/voz/` reemplaza a la voz del navegador para esa línea.

Mientras no haya consentimientos firmados, matices.online la juegan solo el equipo y adultos de prueba, y sus datos se marcan como prueba.

## Criterios para probarlo con niños

- [ ] Ninguna pantalla muestra puntos, resultados ni "bien hecho".
- [ ] "Quiero hablar con alguien" visible en todas las pantallas y probado sin red.
- [ ] Todas las opciones tienen voz y código.
- [ ] Ningún dato sale del aparato con nombre.
- [ ] Consentimiento del tutor y del niño aprobado por el abogado y el comité de ética.
- [ ] Los psicólogos aprobaron textos, tarjetas y códigos (`PENDIENTES.md`).
- [ ] El psicólogo que lo use recibió una práctica con el juego y con la salida de datos.
