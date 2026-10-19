# MVP · Día 1 jugable

> El MVP es lo mínimo para la **fase 1 del piloto** (prueba de uso con un grupo): ver si los niños entienden, cuánto tardan y si algo los altera. No produce reportes clínicos.

## Qué incluye

| Área | Incluye | No incluye |
| --- | --- | --- |
| Juego | Consentimiento del niño, creación de personaje (niña, niño, neutro; 8 tonos; 4 peinados; uniforme y ropa de casa), armar la casa, Día 1 completo (casa, calle, escuela, parque), sucesos E00, E03, E07, E09, dibujo libre, calma y aterrizaje, Mi libro, Ahora no, Quiero hablar con alguien | Días 2 y 3, tiendita, biblioteca del barrio, Sobre mí, escena para describir, estados del cuerpo |
| Voz | La Cuentera y todas las tarjetas del Día 1 | Resto |
| Estación | Abrir sesión, asignar códigos, avisos en vivo, pausa por aparato, guardar eventos cifrados, descargar JSON | Reportes, reglas de revisión, sincronización al servidor |
| Contenido | YAML con esquema validado para los 4 sucesos | Resto de sucesos (ya escritos, sin integrar) |

## Hitos

| Hito | Listo cuando |
| --- | --- |
| M1. Mundo caminable | El personaje camina por la casa, la calle y la escuela en la tableta de referencia a 60 cuadros por segundo |
| M2. Personaje y casa | Se crea el personaje por capas y se arma la casa; todo queda en eventos |
| M3. Modo cuento | E00 se juega de punta a punta con voz, tarjetas, caritas y "Ahora no"; las opciones salen barajadas |
| M4. Estación | 10 aparatos en red local mandan eventos; "Quiero hablar con alguien" llega a la consola en menos de 2 segundos; sin red, los eventos se guardan y se reenvían |
| M5. Día 1 completo | Las 3 sesiones de prueba internas (adultos del equipo) terminan el Día 1 en 30 a 40 minutos sin ayuda |
| M6. Revisión clínica | Los psicólogos aprueban textos, tarjetas y códigos del Día 1 (`docs/PENDIENTES.md`) |

## Criterios de aceptación para llevarlo a un grupo

- [ ] Ninguna pantalla muestra puntos, resultados ni "bien hecho".
- [ ] "Quiero hablar con alguien" visible en todas las pantallas y probado con la red caída.
- [ ] Todas las opciones tienen voz y código.
- [ ] Ningún dato sale del aparato con nombre.
- [ ] Consentimiento del tutor y del niño aprobado por el abogado y el comité de ética.
- [ ] El psicólogo de la escuela recibió una práctica con la estación.
