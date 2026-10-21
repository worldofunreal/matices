# Reporte para el psicólogo

Por cada participante, el tablero muestra un perfil con conteos que describen lo que pasó en el juego, más todos los datos crudos. El perfil cuenta y describe; interpretar le toca al psicólogo.

Tiene la forma de un examen de laboratorio, sin inventar rangos. Cada área es una fila con tres columnas:

| Área | Resultado | De dónde sale | Referencia |
| --- | --- | --- | --- |
| Conducta | `DESAFIA`: 1 de 2 | S01 | Todos (N = 37): del medio 0, de 0 a 2 |

La referencia es el mismo conteo entre todos los participantes: cuántos son, el del medio, el más bajo y el más alto. Un rango de laboratorio sale de un grupo de referencia medido antes (al menos 120 personas por grupo); hasta tener esa muestra por grupo de edad, la referencia solo describe y no lleva colores de "alto" o "bajo". Con la muestra, se agregan franjas como las del SDQ (cerca del promedio, un poco elevado, alto, muy alto).

## Partes

0. **"Quiero hablar con alguien"**, arriba, con hora y pantalla, si lo tocó.
1. **Calidad de los datos.** Sesiones completas, minutos de inactividad, veces que repitió la voz. Si la calidad es baja, el reporte lo dice primero.
2. **Su personaje y su casa.** Imagen del personaje y de la casa, quiénes viven ahí y dónde los puso.
3. **Situaciones.** Por cada situación: qué hizo, quién reaccionó, qué contestó cada vez que le preguntaron y en cuánto tiempo, y cuántas veces lo hizo de nuevo después de contestar.
4. **Por área.** Las áreas en la tabla de arriba, con las situaciones de donde sale cada conteo.
5. **Dibujos.** Imagen final y reproductor trazo por trazo.
6. **Exploración.** Lugares y objetos más visitados y los que nunca tocó; cuánto corrió y dónde.
7. **Marcas de revisión.** Reglas del equipo clínico que se cumplieron, con autor y fecha.
8. **Datos crudos.** CSV y JSON.

## Ejemplo de fragmento

```markdown
**Correr en la casa** (S01)
Corrió en la casa 4 veces. La primera, la abuela le dijo que no corriera.
La segunda, la abuela le habló y contestó "No lo vuelvo a hacer" (PROMETE) en 4 segundos.
Después de contestar, corrió 2 veces más en la casa; la abuela le volvió a hablar y contestó
"Perdón" (SE_DISCULPA) y luego "No me importa" (DESAFIA).
```

## Reglas de escritura

- Solo verbos de lo que pasó: "corrió", "contestó", "tocó", "se fue".
- Ninguna etiqueta clínica; nada de "presenta", "sugiere" ni "indica".
- Ningún puntaje de riesgo. La comparación con los demás solo describe (N, del medio, mínimo y máximo).
- Tablas y conteos con su fuente, no párrafos que interpreten: un texto escrito por computadora suena convincente aunque sea genérico.
- Cada frase enlaza a los eventos que la generan.

## Marcas de revisión

Las escribe el equipo clínico; el tablero solo las aplica.

- Forma: una condición sobre conteos y una marca ("revisar pronto" o "revisar"). Ejemplo: si contestó `PROMETE` y lo repitió 3 o más veces, marcar "revisar".
- El juego se entrega **sin reglas activas**; las de este documento son ejemplos.
- "Quiero hablar con alguien" no depende de ninguna regla.

## Tablero

En `matices.online/admin`, con una cuenta de admin. **Todos:** participantes con su avance, dónde se quedan, uso por pantalla, errores y conteos por área. **Un participante:** este perfil y la descarga de sus datos.
