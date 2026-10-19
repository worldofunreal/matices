# Arquitectura técnica

## Decisión

El juego corre en el navegador de cada aparato y lo sirve la **estación del psicólogo**: una laptop con un programa que crea la red de la sesión, entrega el juego, recibe los eventos y muestra los avisos. No se necesita internet en el salón.

```
 Tabletas / Chromebooks / PCs de los niños  (navegador)
            │  Wi-Fi local (router del salón o punto de acceso de la laptop)
            ▼
 Estación del psicólogo (laptop Windows, macOS o Linux)
   ├─ Sirve el juego (archivos estáticos)
   ├─ Recibe eventos por WebSocket y los guarda cifrados
   ├─ Consola web del psicólogo (avisos, sesiones, reportes, reglas)
   └─ Sincroniza al servidor cuando hay internet
            │  HTTPS, solo cuando hay conexión
            ▼
 Servidor de la institución (datos cifrados, respaldo, reportes)
```

Por qué así: muchas escuelas no tienen internet confiable; el aviso de "Quiero hablar con alguien" tiene que llegar en segundos; y los datos no deben quedarse en aparatos compartidos.

## Componentes

| Componente | Tecnología | Por qué |
| --- | --- | --- |
| Juego | TypeScript + Phaser 3 + Vite | Corre en cualquier navegador, bueno para pixel art 2D, ligero en tabletas baratas |
| Contenido | Archivos YAML en `contenido/`, validados con un esquema al compilar | Los psicólogos pueden revisar texto legible; una opción sin código rompe la compilación |
| Estación | Un solo ejecutable en Rust (axum + SQLite cifrado con SQLCipher) | Se instala copiando un archivo; no depende de nada más |
| Consola del psicólogo | Web servida por la estación | Misma laptop, sin instalar otra cosa |
| Servidor | Mismo binario en modo servidor | Una sola base de código |

## Flujo de datos

1. El psicólogo abre la estación, inicia sesión con contraseña y segundo factor, y abre una sesión de grupo.
2. Cada aparato entra a la dirección local; el psicólogo le asigna un código de niño.
3. El juego manda cada evento al momento; si la red se cae, los guarda cifrados en el navegador y los reenvía.
4. Al confirmar la recepción, el aparato borra su copia.
5. La estación arma el reporte al terminar cada sesión y aplica las reglas de revisión.
6. Con internet, la estación sube los datos cifrados al servidor.

## Eventos

Esquema en `docs/clinico/codigos-y-eventos.md`. Cada evento lleva la versión del contenido, así un reporte siempre sabe qué texto vio el niño.

## Seguridad

- La lista código–nombre solo existe en la estación, cifrada con la contraseña del psicólogo.
- Los aparatos nunca guardan nombres ni dibujos después de enviarlos.
- Bitácora de accesos inmutable en la estación.
- Sin bibliotecas de analítica, publicidad ni rastreo.

## Pendientes técnicos

- Elegir el punto de acceso de referencia (router portátil o la laptop como hotspot).
- Probar Phaser en la tableta de referencia (2 GB de RAM) antes de fijar efectos de ambiente.
