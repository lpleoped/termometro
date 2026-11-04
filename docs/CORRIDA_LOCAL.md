# Correr Termómetro de Equipo en local

Guía para clonar **solo este repo** y levantar la demo. No hace falta `termometro-api` ni `termometro-ui`.

## Requisitos

- Node.js **≥ 20**
- npm (viene con Node)
- MongoDB en local (puerto 27017 por defecto)

## Pasos

```bash
git clone <url-de-este-repo>
cd termometro-de-equipo

npm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Variables mínimas:

| Archivo | Variable | Valor típico |
|---------|----------|--------------|
| `apps/api/.env` | `PORT` | `3000` |
| `apps/api/.env` | `MONGO_URI` | `mongodb://localhost:27017/termometro-de-equipo` |
| `apps/api/.env` | `JWT_SECRET` | secreto local de al menos 32 caracteres |
| `apps/api/.env` | `AI_CREDENTIAL_SECRET` | secreto distinto de al menos 32 caracteres |
| `apps/web/.env` | `VITE_API_URL` | `http://localhost:3000/api` |

Para generar automáticamente los secretos locales y levantar ambos procesos:

```bash
npm run dev
```

En producción, no uses el generador local. Configurá los secretos mediante el proveedor de despliegue o un secret manager.

En **dos terminales**:

```bash
npm run dev:api   # http://localhost:3000  ·  GET /api/health
npm run dev:web   # http://localhost:5173
```

Cargar datos demo:

```bash
npm run seed
```

Login demo: `test@test.com` / `123123`

## Verificar

1. Abrir http://localhost:5173
2. Login con el usuario seed
3. Backoffice → ver equipos / evaluaciones
4. Dashboard de una instancia → índice y participación
5. Abrir el link `/responder/:instanciaId` y enviar Likert

## Scripts útiles

| Script | Qué hace |
|--------|----------|
| `npm run dev:api` | API en modo desarrollo |
| `npm run dev:web` | Vite UI |
| `npm run seed` | Seed clima (idempotente por título/email) |
| `npm run build` | shared → api → web |

## Problemas frecuentes

- **API no arranca:** Mongo no está corriendo o `MONGO_URI` incorrecta.
- **Web sin datos:** falta `npm run seed` o `VITE_API_URL` no apunta a `/api`.
- **401 en dashboard:** token ausente; volver a login.

Checklist de verificación: [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md).  
Más detalle de negocio: [INDICADORES.md](./INDICADORES.md). Arquitectura: [ARQUITECTURA.md](./ARQUITECTURA.md).
