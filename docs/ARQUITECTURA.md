# Arquitectura — Termómetro de Equipo

## Decisión: monorepo

**Decisión:** un solo repositorio Git (`termometro-de-equipo`).

**Razones (skill `arquitectura-software`):**

1. Un solo producto y una sola visión (clima de equipo).
2. Contratos compartidos API↔UI en `packages/shared` (evita el drift de dos gits de referencia).
3. Una sola `LICENSE` / `NOTICE` para cotitularidad autor + IBM.
4. Equipo pequeño / autor-maintainer: menos fricción operativa.
5. Open source: un lugar para issues, CI y contribuciones.

**Consecuencias:** versionado conjunto de API y web; releases del producto, no de paquetes independientes (salvo que más adelante se publique `@termometro/shared`).

**Fuera:** producto SUS/usabilidad = otro repo. Repos `termometro-api` / `termometro-ui` = solo referencia.

## Estructura

```
termometro-de-equipo/
  apps/api          # Express + TS + Mongo
  apps/web          # React + Vite + TS
  packages/shared   # tipos y contratos
  docs/
  .cursor/skills/
```

## Stack inicial (continuidad con referencia)

| Capa | Stack |
|------|--------|
| API | Node, Express, TypeScript, Mongoose/MongoDB, JWT |
| Web | React 19, Vite, TypeScript |
| Shared | TypeScript types (evolución hacia validación Zod opcional) |

## Principio de dominio

Una métrica principal: **índice de clima ponderado 0–100**. Sin `switch` de tipos SUS/NPS que redefinan el termómetro.
