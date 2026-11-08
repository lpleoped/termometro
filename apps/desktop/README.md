# Termómetro de Equipo — aplicación de escritorio

La aplicación inicia la API local con JSON, guarda los datos en la carpeta de
usuario de Windows y abre el frontend compilado en una ventana Electron.

## Desarrollo

Desde la raíz:

```bash
npm run desktop
```

## Instalador Windows

Desde Windows, con el build completo disponible:

```bash
npm run package:win
```

El empaquetado prepara primero un runtime mínimo con las dependencias de la
API; no copia todo el `node_modules` del monorepo.

El instalador se genera en `apps/desktop/release/`. Los datos no se guardan en
la carpeta de instalación; viven en `%APPDATA%/Termometro de Equipo/data`.
El instalador todavía no está firmado digitalmente.
