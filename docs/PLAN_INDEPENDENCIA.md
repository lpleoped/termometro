# Alcance del monorepo — Termómetro de Equipo

## Decisión

Este monorepo es el **producto completo**. Corre solo: API + web + shared + docs.  
No depende en runtime de `termometro-api` ni `termometro-ui` (solo referencia histórica de lectura).

## Qué incluye

1. Auth (login / registro)
2. Equipos
3. Evaluaciones con secciones y ponderación (= 100%)
4. Publicar instancia a equipo
5. Responder Likert (público)
6. Dashboard estado actual (índice, secciones, indicadores, participación, semáforo clima)
7. Histórico (misma fórmula)
8. Plan de acción
9. Seed de datos demo
10. `npm run dev:api` + `npm run dev:web`

## Entrega (fases)

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Scaffold runnable (Express + Vite) | ✅ |
| 1 | API clima | ✅ |
| 2 | Web (misma UX) | ✅ |
| 3 | Shared + docs de corrida | ✅ |
| 4 | Pulido marca / checklist | ✅ |

## Criterio de listo

- [x] Este repo solo: API + web + Mongo local
- [x] Seed de clima carga datos demo
- [x] Flujo completo visible con la UI actual
- [x] README permite reproducir en otra máquina

Guías: [CORRIDA_LOCAL.md](./CORRIDA_LOCAL.md), [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md), [INDICADORES.md](./INDICADORES.md).
