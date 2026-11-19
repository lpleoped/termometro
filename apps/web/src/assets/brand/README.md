# Sistema visual Termómetro

Los SVG de esta carpeta son las fuentes canónicas del nuevo sistema visual.
El emblema está construido con geometría SVG real; los PNG se generan de forma
determinista con `scripts/generate-brand-assets.mjs` para mantener compatibilidad
con los imports existentes.

El lockup usa texto SVG con una pila sans-serif (`Arial`, `Helvetica`) para que
el wordmark siga siendo editable. El emblema independiente, que es el activo
usado por la aplicación, sí está compuesto por trazados y formas vectoriales.

Variantes:

- `termometro-emblema.svg`: azul marino con acento teal.
- `termometro-emblema-azul.svg`: azul principal.
- `termometro-emblema-celeste.svg`: celeste técnico.
- `termometro-emblema-blanco.svg`: fondos oscuros.
- `termometro-emblema-salud.svg`: acento teal sanitario, sin estética médica.
- `termometro-emblema-negro.svg`: monocromo.
- `termometro-lockup.svg` y `termometro-lockup-blanco.svg`: emblema + wordmark.

Los PNG transparentes equivalentes quedan en `png/`. El script también
actualiza los recursos PWA, favicon y el icono de escritorio.
