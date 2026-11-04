# Termómetro de Equipo

Diagnóstico de **clima / estado de equipos**: evaluaciones Likert por secciones ponderadas, índice 0–100, participación, histórico y plan de acción.

Monorepo independiente (API + web + shared).

## Origen y titularidad

La idea y el trabajo creativo son de Leonardo Pedreira (charla pública ~2015; desarrollo e iniciativa personal). Por marco contractual con **IBM**, IBM también figura como cotitular. El CTO de IBM Consulting autorizó por escrito publicarlo como open source, con la condición de no incluir gente, clientes ni material que comprometa a la empresa. Detalle: [docs/ORIGEN_Y_TITULARIDAD.md](docs/ORIGEN_Y_TITULARIDAD.md), `NOTICE`, `COPYRIGHT`, `LICENSE` (Apache-2.0).

## Estructura

```
apps/api       → API (Express + TS + Mongo)
apps/web       → UI (React + Vite + TS)
packages/shared → tipos y contratos compartidos
docs/
```

- Arquitectura: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Indicadores: [docs/INDICADORES.md](docs/INDICADORES.md)
- API: [docs/API.md](docs/API.md)
- Alcance: [docs/PLAN_INDEPENDENCIA.md](docs/PLAN_INDEPENDENCIA.md)

## Estado y seguridad

Este proyecto está en estado MVP/beta. Puede utilizarse para demostraciones y desarrollo, pero todavía no debe presentarse como una plataforma enterprise auditada.

Las API keys de proveedores IA se cargan por la interfaz y se almacenan cifradas en el backend. Nunca deben colocarse en variables del frontend, `localStorage` ni en el repositorio. Los secretos del despliegue deben configurarse mediante variables seguras o un secret manager. Detalle: [SECURITY.md](SECURITY.md).

## Correr en local

Guía completa: [docs/CORRIDA_LOCAL.md](docs/CORRIDA_LOCAL.md).

**Requisitos:** Node ≥ 20, MongoDB local.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run setup:dev # genera secretos locales si faltan
npm run seed      # datos demo, opcional
npm run dev       # API + web juntos
```

Login demo: `test@test.com` / `123123`

Checklist: [docs/SMOKE_CHECKLIST.md](docs/SMOKE_CHECKLIST.md).

## Skills del agente

Proyecto: `.cursor/skills/` (`producto-termometro`, `dominio-indicadores`, `arquitectura-api`, `arquitectura-web`, …).  
Personales: `arquitectura-software`, `product-manager`, `legal-open-source-ibm`, `pedido-feature`.
