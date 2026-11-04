---
name: arquitectura-api
description: >-
  Convenciones del API Node/Express/TS del monorepo Termómetro de Equipo.
  Usar al crear endpoints, servicios o modelos.
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
