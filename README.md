# Termómetro de Equipo

Diagnóstico de **clima / estado de equipos**: evaluaciones Likert por secciones ponderadas, índice 0–100, participación, histórico y plan de acción.

Monorepo open source (línea nueva). **Sin** encuestas SUS.

## Origen y titularidad

La idea y el trabajo creativo son del autor (charla pública ~2015; desarrollo e iniciativa personal). Por marco contractual con **IBM**, IBM también es cotitular. Detalle: [docs/ORIGEN_Y_TITULARIDAD.md](docs/ORIGEN_Y_TITULARIDAD.md), `NOTICE`, `COPYRIGHT`, `LICENSE` (Apache-2.0).

**No publicar este repo en público** sin autorización escrita de IBM para open source.

## Estructura

```
apps/api       → API (Express + TS + Mongo)
apps/web       → UI (React + Vite + TS)
packages/shared
docs/
```

Decisión de forma: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) (monorepo).  
Nombres alternativos (PM): [docs/PROPUESTAS_NOMBRE.md](docs/PROPUESTAS_NOMBRE.md).

## Repos de referencia (intactos)

`termometro-api` y `termometro-ui` quedan como están: referencia histórica. Este árbol no los modifica.

## Estado

Scaffold inicial + skills de producto. Port del núcleo clima: pendiente.

## Skills del agente

Proyecto: `.cursor/skills/` (`producto-termometro`, `anti-sus-en-termometro`, `dominio-indicadores`, `arquitectura-api`, `arquitectura-web`).  
Personales: `arquitectura-software`, `product-manager`, `legal-open-source-ibm`, `pedido-feature`.
