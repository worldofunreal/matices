# Reporte para el psicólogo

Por cada participante, el tablero muestra un perfil con conteos que describen lo que pasó en el juego, más todos los datos crudos. El perfil cuenta y describe; interpretar le toca al psicólogo.

Tiene la forma de un examen de laboratorio, sin inventar rangos. Cada área es una fila con tres columnas:

| Área | Resultado | De dónde sale | Referencia |
| --- | --- | --- | --- |
| Necesidades físicas | `AUSENTE`: 2 de 4 | E01, E02 | Todos (N = 37): del medio 1, de 0 a 3 |

La referencia es el mismo conteo entre todos los participantes: cuántos son, el del medio, el más bajo y el más alto. Un rango de laboratorio sale de un grupo de referencia medido antes (al menos 120 personas por grupo); hasta tener esa muestra por grupo de edad, la referencia solo describe y no lleva colores de "alto" o "bajo". Con la muestra, se agregan franjas como las del SDQ (cerca del promedio, un poco elevado, alto, muy alto).

## Partes

0. **"Quiero hablar con alguien"**, arriba, con hora y pantalla, si lo tocó.
1. **Calidad de los datos.** Sesiones completas, minutos de inactividad, veces que repitió la voz, respuestas dadas antes de que terminara la narración. Si la calidad es baja, el reporte lo dice primero.
2. **Su personaje y su casa.** Imagen del personaje y de la casa, quiénes viven ahí y dónde los puso.
3. **Por área.** Las 13 áreas en la tabla de arriba, con los sucesos de donde sale cada conteo.
4. **Patrones que cruzan áreas.** Cuántas veces buscó ayuda y a quién, dónde usó "Ahora no", en qué sucesos dudó más o cambió de opinión.
5. **Sobre mí.** Respuestas a los gemelos, agrupadas por área.
6. **Dibujo.** Imagen final y reproductor trazo por trazo.
7. **Exploración.** Lugares y objetos más visitados y los que nunca tocó.
8. **Marcas de revisión.** Reglas del equipo clínico que se cumplieron, con autor y fecha.
9. **Datos crudos.** CSV y JSON.

## Ejemplo de fragmento

```markdown
**Necesidades físicas** (E01, E02, E03, E08)
En 3 de 4 sucesos, en su historia no llegó ningún adulto (AUSENTE: 2, AUTOSUFICIENTE: 1).
En E03 llegó la tía y lo curó (PROTEGE).
En E01 tocó primero "el abuelo" y cambió a "lo resuelve sin ayuda"; fue su decisión más lenta de la sesión.

**Pedir ayuda**
En 10 sucesos donde podía buscar a alguien, lo hizo en 2. Las dos veces buscó a la tía.
Usó "Ahora no" una vez, en E13 (promesa incumplida).
```

## Reglas de escritura

- Solo verbos de lo que pasó: "eligió", "en su historia", "tocó", "no abrió".
- Ninguna etiqueta clínica; nada de "presenta", "sugiere" ni "indica".
- Ningún puntaje de riesgo. La comparación con los demás solo describe (N, del medio, mínimo y máximo).
- Tablas y conteos con su fuente, no párrafos que interpreten: un texto escrito por computadora suena convincente aunque sea genérico.
- Cada frase enlaza a los eventos que la generan.

## Marcas de revisión

Las escribe el equipo clínico; el tablero solo las aplica.

- Forma: una condición sobre conteos y una marca ("revisar pronto" o "revisar"). Ejemplo: si en 3 o más sucesos de necesidades físicas el código es `AUSENTE`, marcar "revisar pronto".
- El juego se entrega **sin reglas activas**; las de este documento son ejemplos.
- "Quiero hablar con alguien" no depende de ninguna regla.

## Tablero

En `matices.online/admin`, con una cuenta de admin. **Todos:** participantes con su avance, dónde se quedan, uso por pantalla, errores y conteos por área. **Un participante:** este perfil y la descarga de sus datos.
