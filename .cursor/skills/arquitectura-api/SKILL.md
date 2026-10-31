---
name: arquitectura-api
description: >-
  Convenciones del API Node/Express/TS del monorepo Termómetro de Equipo.
  Usar al crear endpoints, servicios, modelos o al portar desde termometro-api.
---

# Arquitectura API

## Ubicación

`apps/api` — Express + TypeScript + Mongoose.

## Capas

`routes → controllers → services → models`

- Rutas: wiring y middleware auth.
- Controllers: HTTP in/out.
- Services: reglas de negocio (incl. índice clima).
- Models: esquemas Mongo.

## Contratos

Tipos compartidos en `packages/shared`. Todo cambio de payload actualiza shared **en el mismo PR**.

## Al portar desde termometro-api

Copiar solo núcleo clima. Eliminar ramas SUS/NPS/CSAT, rutas `/flujos`, seeds SUS. Referencia: no editar el repo viejo.
