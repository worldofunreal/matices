# MVP · El juego completo con arte provisional

> El MVP es el bucle completo del juego (GDD) jugable de principio a fin con arte provisional. El arte final entra después reemplazando archivos en `public/assets/`, sin tocar código (`arte/direccion-de-arte.md`). Cada hito se publica en https://matices.online y se revisa ahí.

## Hitos

| Hito | Qué incluye | Listo cuando |
| --- | --- | --- |
| H1. Base (hecho; se conserva) | Carpeta de arte con un archivo provisional por cada pieza; el juego carga todo desde la lista de arte; colores de piel y cabello desde la paleta; guardado y regreso; registro de eventos cifrado en el aparato | Se reemplaza un PNG provisional por otro del mismo tamaño y el juego lo muestra sin cambiar código; se cierra el juego a la mitad y regresa donde estaba |
| M0. Base sin Phaser | Interfaz en React y CSS: letra, colores, botones, tarjetas, paneles; acomodo para vertical y horizontal; cada pantalla carga solo su arte | Abre en menos de 1 segundo en un teléfono |
| M1. Personaje | Creación de personaje (GDD §6) con las reglas de experiencia (GDD §12) | El owner aprueba cómo se ve; ese estilo sigue en todo lo demás |
| M2. Armar la casa | Figuras a los cuartos, renombrar, quitar (GDD §7) | Funciona igual en vertical y en horizontal |
| M3. Mundo | El mapa en el lienzo, botones encima en HTML; los nueve lugares, puertas, días y horas, vecinos, objetos, espejo | Se recorren los tres días como antes de la migración |
| M4. Situaciones | Correr, el perro, letreros en las salidas y las situaciones de GDD §9, una por una; dibujo libre en Mi libro | Cada situación se juega dentro del mundo y deja sus eventos; una pregunta espera su respuesta |
| H7. Siempre a la mano | "Quiero hablar con alguien", Mi libro, opciones (GDD §13, §15) | Se alcanzan desde cualquier pantalla con una mano |
| H8. Datos | El juego envía sus eventos a un servidor propio en IONOS; tablero con cuenta de admin: perfil de cada participante y vista de todos (PRD F9 a F17) | Una partida jugada en matices.online aparece en el tablero; el perfil muestra cada parte de `clinico/reporte.md` |
| P1. Prueba de la experiencia | Vueltas de jugar, juzgar con los tres pilares (intuitivo, fácil, simple), corregir y volver a jugar; con niños cuando jueguen (`investigacion/plan-piloto.md`, fase 1) | Una vuelta completa no encuentra nada importante en ningún pilar |
| H9. Plataformas | Android e iOS (Capacitor), Windows, macOS y Linux (Tauri) | El juego se instala y juega sin red en cada una |

Una grabación en `public/assets/voz/` suena sola; sin grabación, la voz del navegador suena cuando el niño toca la bocina.

## Criterios del producto

- [ ] Ninguna pantalla muestra puntos, resultados ni "bien hecho".
- [ ] "Quiero hablar con alguien" visible en todas las pantallas y probado sin red.
- [ ] Todas las respuestas tienen voz y código.
- [ ] No hay cuestionarios: solo pregunta un adulto del mundo cuando el niño repite algo, y el mundo espera su respuesta.
- [ ] Ningún dato sale del aparato con nombre.
