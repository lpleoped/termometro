# Termómetro de Equipo

Diagnóstico de **clima / estado de equipos**: evaluaciones Likert por secciones ponderadas, índice 0–100, participación, histórico y plan de acción.

Monorepo independiente (API + web + shared).

## Origen y titularidad

La idea y el trabajo creativo son de Leonardo Pedreira (charla pública ~2015; desarrollo e iniciativa personal). Por marco contractual con **IBM**, IBM también figura como cotitular. El CTO de IBM Consulting autorizó por escrito publicarlo como open source, con la condición de no incluir gente, clientes ni material que comprometa a la empresa. Detalle: [docs/ORIGEN_Y_TITULARIDAD.md](docs/ORIGEN_Y_TITULARIDAD.md), `NOTICE`, `COPYRIGHT`, `LICENSE` (Apache-2.0).

## Estructura

```
apps/api       → API (Express + TS + Mongo / JSON local)
apps/web       → UI (React + Vite + TS)
apps/desktop   → Empaquetado instalable (Electron)
packages/shared → tipos y contratos compartidos
```

Open source autorizado (Apache-2.0). Atribución y titularidad: [docs/ORIGEN_Y_TITULARIDAD.md](docs/ORIGEN_Y_TITULARIDAD.md), `NOTICE`, `COPYRIGHT`, `LICENSE`.

## Estado y seguridad

Este proyecto está en estado MVP/beta. Puede utilizarse para demostraciones y desarrollo, pero todavía no debe presentarse como una plataforma enterprise auditada.

Las API keys de proveedores IA se cargan por la interfaz y se almacenan cifradas en el backend. Nunca deben colocarse en variables del frontend, `localStorage` ni en el repositorio. Los secretos del despliegue deben configurarse mediante variables seguras o un secret manager. Detalle: [SECURITY.md](SECURITY.md).

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

Login demo: `test@test.com` / `123123`
