# API — resumen

Base: `http://localhost:3000/api`  
Auth: header `Authorization: Bearer <token>` donde se indica.

| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET | `/health` | no | Health + Mongo |
| POST | `/auth/register` | no | |
| POST | `/auth/login` | no | `{ token }` |
| GET | `/auth/me` | sí | |
| GET/POST | `/equipos` | sí | |
| GET | `/tipos-evaluacion` | no | Solo `CUSTOM` |
| GET/POST | `/evaluaciones` | sí* | GET por id es público |
| PUT/DELETE | `/evaluaciones/:id` | sí | |
| POST/GET | `/instancias` | sí* | GET `/:instanciaId` público |
| POST | `/respuestas` | no | Likert 1–5 |
| GET | `/dashboard/estado-actual/:instanciaId` | sí | Índice clima |
| GET | `/dashboard/historico/:equipoId/:evaluacionId` | sí | Misma fórmula |
| GET/POST | `/acciones` | sí | Plan de acción |
| POST | `/acciones/sugerencias` | sí | Requiere `OPENAI_API_KEY` |
| GET/POST | `/ai/providers` | sí | Lista o registra un proveedor IA del usuario |
| PUT/DELETE | `/ai/providers/:id` | sí | Actualiza o elimina configuración IA |
| POST | `/ai/providers/:id/test` | sí | Verifica conexión con `/models` |
| GET/POST | `/ai/analyses` | sí | Lista o genera análisis estructurado |

\* Ver tabla: listados autenticados; algunas lecturas públicas para responder.

Contratos TypeScript: paquete `@termometro/shared`.
