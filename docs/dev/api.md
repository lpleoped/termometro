# API — resumen

Base local: `http://localhost:3000/api`.

Donde la tabla dice que hace falta autenticación, el header es `Authorization: Bearer <token>`.

Los contratos de TypeScript viven en `@termometro/shared`. El índice de clima que devuelven el estado actual y el histórico es el de [indicadores](./indicadores.md).

| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET | `/health` | no | Salud del proceso y de Mongo |
| POST | `/auth/register` | no | |
| POST | `/auth/login` | no | Responde `{ token }` |
| GET | `/auth/me` | sí | |
| GET/POST | `/equipos` | sí | |
| GET | `/tipos-evaluacion` | no | Solo `CUSTOM` |
| GET/POST | `/evaluaciones` | sí* | El GET por id es público |
| PUT/DELETE | `/evaluaciones/:id` | sí | |
| POST/GET | `/instancias` | sí* | El GET `/:instanciaId` es público, para responder |
| POST | `/respuestas` | no | Likert 1–5 |
| GET | `/dashboard/estado-actual/:instanciaId` | sí | Índice de la ronda |
| GET | `/dashboard/historico/:equipoId/:evaluacionId` | sí | La misma fórmula, por ronda |
| GET/POST | `/acciones` | sí | Plan de acción |
| POST | `/acciones/sugerencias` | sí | Pide `instanciaId`. Usa el proveedor de IA de la cuenta |
| GET/POST | `/ai/providers` | sí | Lista o registra un proveedor de la cuenta |
| PUT/DELETE | `/ai/providers/:id` | sí | Actualiza o elimina esa configuración |
| POST | `/ai/providers/:id/test` | sí | Prueba la conexión con `/models` |
| GET/POST | `/ai/analyses` | sí | Lista o genera un análisis estructurado |

\* Los listados piden autenticación. Algunas lecturas son públicas para que una persona pueda responder el enlace sin cuenta.
