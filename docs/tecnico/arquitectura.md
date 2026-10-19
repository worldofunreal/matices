# Arquitectura técnica

## Decisión

El juego es una aplicación que funciona completa dentro de cada aparato, sin red. Guarda los eventos cifrados en el propio aparato. Cómo salen los datos hacia el psicólogo se elige después, según lo que apruebe cada institución (`../CONTEXTO-DE-USO.md`); el juego no cambia.

```
 Juego en el aparato (tableta Android, Chromebook o PC)
   ├─ Todo el contenido incluido; no necesita red para jugar
   ├─ Eventos guardados cifrados en el aparato
   └─ Salida de datos, una de estas:
        A. Archivo cifrado que el psicólogo descarga a su computadora (base, siempre disponible)
        B. Estación del psicólogo en la red local: avisos en vivo (opcional)
        C. Servidor de la institución por internet (opcional)
```

Por qué así: no sabemos todavía si habrá grupo, red, internet ni cuántas sesiones. Un juego que depende de la red falla en el lugar donde no la hay; uno que funciona solo sirve en todos.

## Componentes

| Componente | Tecnología | Por qué |
| --- | --- | --- |
| Juego | TypeScript + Phaser 3 + Vite | Bueno para pixel art 2D, ligero en tabletas baratas, un solo código para todos los aparatos |
| Empaque | Aplicación instalable desde el navegador (funciona sin conexión); Capacitor para un instalable de Android si se necesita | Se instala una vez y luego no necesita red |
| Contenido | Archivos YAML en `contenido/`, validados con un esquema al compilar | Los psicólogos pueden revisar texto legible; una opción sin código rompe la compilación |
| Guardado en el aparato | Base de datos del navegador, cifrada | Sobrevive a cerrar la app y a quedarse sin batería |
| Mapas | Tiled | Dayana y Omar arman y editan los mapas sin tocar código |
| Estación (opcional, modo B) | Un ejecutable en Rust (axum + SQLite cifrado con SQLCipher) | Se instala copiando un archivo |
| Servidor (opcional, modo C) | El mismo ejecutable en modo servidor | Una sola base de código |

## Flujo de datos

1. Un adulto abre el juego y escribe el código del niño (nunca su nombre).
2. El juego guarda cada evento cifrado en el aparato. Se puede pausar y retomar en cualquier momento.
3. Al terminar, los datos salen por el modo que use la institución (A, B o C). Al confirmarse la entrega, el aparato borra su copia.
4. El programa del psicólogo abre los datos, arma el reporte y aplica las reglas de revisión.

## Eventos

Esquema en `docs/clinico/codigos-y-eventos.md`. Cada evento lleva la versión del contenido, así un reporte siempre sabe qué texto vio el niño.

## Seguridad

- La lista código–nombre nunca está en el aparato del niño; la guarda el psicólogo, cifrada.
- Los aparatos borran nombres de figuras y dibujos al entregar los datos.
- Bitácora de accesos en el programa del psicólogo.
- Sin bibliotecas de analítica, publicidad ni rastreo.

## Pendientes técnicos

- Probar Phaser en la tableta de referencia (2 GB de RAM) antes de fijar efectos de ambiente.
- Cómo se entrega el archivo cifrado en el modo A (cable, memoria USB o código QR) según los aparatos que haya.
