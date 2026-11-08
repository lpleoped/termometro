# Termómetro de Equipo

Diagnóstico de **clima / estado de equipos**: evaluaciones Likert por secciones ponderadas, índice 0–100, participación, histórico y plan de acción.

Monorepo open source (API + web + desktop + shared).

## Licencia

Licensed under the [Apache License, Version 2.0](LICENSE).

```
Copyright 2024-2026 Leonardo Pedreira
Copyright 2024-2026 International Business Machines Corporation (IBM)
```

Atribución completa: [`NOTICE`](NOTICE), [`COPYRIGHT`](COPYRIGHT).  
Origen y titularidad: [docs/ORIGEN_Y_TITULARIDAD.md](docs/ORIGEN_Y_TITULARIDAD.md).

Esto **no** es un producto oficial de IBM.

## Origen y titularidad

Idea y desarrollo de Leonardo Pedreira en **2024–2025**, en tiempo personal. Presentada en **2025** en IBM como **iniciativa personal** ante más de 100 personas, como proyecto de IA aplicada en desarrollo de software. Por marco contractual, IBM figura también como cotitular. El CTO de IBM Consulting autorizó por escrito el open source (“lo hiciste en tu tiempo, es tuyo”), con la condición de no incluir gente, clientes ni material que comprometa a la empresa.

## Estructura

```
apps/api        → API (Express + TS + Mongo / JSON local)
apps/web        → UI (React + Vite + TS)
apps/desktop    → Empaquetado instalable (Electron)
packages/shared → Tipos y contratos compartidos
```

## Estado y seguridad

Proyecto en estado MVP/beta: apto para demos y desarrollo; todavía no debe presentarse como plataforma enterprise auditada.

Las API keys de proveedores de IA se cargan por la interfaz y se almacenan cifradas en el backend. No deben ir al frontend, a `localStorage` ni al repositorio. Los secretos de despliegue van en variables de entorno o un secret manager. Detalle: [SECURITY.md](SECURITY.md).

## Descargas y releases

La distribución profesional de la app Windows es por **GitHub Releases** (tag `vX.Y.Z`).

- Instaladores: https://github.com/lpleoped/termometro/releases
- Proceso de publicación: [RELEASE.md](RELEASE.md)
- Push a `main` corre CI; solo un tag publica el instalador

## Correr en local

**Requisitos:** Node ≥ 20. MongoDB solo si usás `STORAGE_DRIVER=mongo`.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run setup:dev # genera secretos locales si faltan
npm run seed      # datos demo, opcional
npm run dev       # API + web juntos
```

Usuario demo del seed (solo desarrollo local): `test@test.com` / `123123`
