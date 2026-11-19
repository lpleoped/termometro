# Identidad visual Termómetro

## Estado

Se implementó en el proyecto la nueva dirección visual aprobada: una identidad
B2B sobria, técnica y editorial, basada en un emblema geométrico de termómetro y
medición. No se presenta como recuperación histórica del logo anterior: es una
nueva propuesta aprobada para reemplazar los raster no verificables existentes.

## Fuentes canónicas

Los SVG editables viven en
[`apps/web/src/assets/brand`](../apps/web/src/assets/brand):

- `termometro-emblema.svg`: azul marino con acento teal.
- `termometro-emblema-azul.svg`: azul principal.
- `termometro-emblema-celeste.svg`: celeste técnico.
- `termometro-emblema-blanco.svg`: uso sobre fondos oscuros.
- `termometro-emblema-salud.svg`: variante con acento teal.
- `termometro-emblema-negro.svg`: monocromo.
- `termometro-lockup.svg` y `termometro-lockup-blanco.svg`: emblema + wordmark.

El emblema está construido con geometría SVG real. El wordmark del lockup usa
texto SVG editable con una pila sans-serif para no incrustar una tipografía no
licenciada; la aplicación continúa mostrando el nombre como texto accesible
junto al emblema.

## PNG y compatibilidad

Las versiones transparentes individuales se generan en
[`apps/web/src/assets/brand/png`](../apps/web/src/assets/brand/png). Para no
romper imports existentes, también se actualizaron:

- `apps/web/src/assets/termometro-logo.png` — emblema principal.
- `apps/web/src/assets/termometro-logo2.png` — variante azul.
- `apps/web/src/assets/termometro-logo3.png` — variante celeste.
- `apps/web/src/assets/bars.png` — ilustración limpia de la Home.
- `apps/web/src/assets/results.png` — composición limpia de resultados.

Los íconos PWA, favicons y el ícono de escritorio también se regeneraron con el
emblema blanco sobre azul marino. El script reproducible es
[`scripts/generate-brand-assets.mjs`](../scripts/generate-brand-assets.mjs).

## Criterio de sustitución

Se mantuvieron los nombres de los recursos que ya consumía la aplicación y se
reemplazó su contenido, evitando cambios innecesarios en componentes y rutas.
Las variantes no usadas directamente quedan disponibles en `brand/` para
reportes, fondos oscuros, impresión y futuras piezas de comunicación.
