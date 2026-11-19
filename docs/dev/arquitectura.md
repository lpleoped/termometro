# Arquitectura — Termómetro de Equipo

## Decisión: monorepo

Un solo repositorio Git para un solo producto: el diagnóstico de clima de equipo.

Razones:

1. Una sola visión de producto.
2. Los contratos entre API y UI viven en `packages/shared`.
3. Una sola `LICENSE` y un solo `NOTICE` para la titularidad descrita en `docs/ORIGEN_Y_TITULARIDAD.md`.
4. Un maintainer: menos fricción para issues, CI y contribuciones.

Consecuencia: API y web se versionan juntas. El release es del producto. `@termometro/shared` se publica como paquete aparte solo si más adelante se decide eso.

## Estructura

```text
termometro-de-equipo/
  apps/api          Express + TypeScript. Mongo o JSON local.
  apps/web          React + Vite + TypeScript.
  apps/desktop      Empaquetado instalable (Electron) de la misma web y la misma API.
  packages/shared   Tipos, contratos y la lectura del semáforo.
  docs/dev          Esta documentación.
```

## Stack

| Capa | Stack |
|------|--------|
| API | Node, Express, TypeScript, Mongoose/MongoDB o JSON local, JWT |
| Web | React 19, Vite, TypeScript |
| Shared | TypeScript |
| Escritorio | Electron, sobre la web y la API locales |

## Principio de dominio

Una métrica principal: el índice de clima ponderado, de 0 a 100. La fórmula y el semáforo están en [indicadores](./indicadores.md). Las preguntas abiertas forman parte del instrumento y no suman a ese índice.
