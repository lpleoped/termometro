# `@termometro/api`

API Express + TypeScript + MongoDB — clima de equipo.

```bash
# desde la raíz del monorepo
cp apps/api/.env.example apps/api/.env
npm run dev:api
npm run seed
```

Demo seed: `test@test.com` / `123123`

Endpoints: [docs/API.md](../../docs/API.md).

## Eliminar los datos de un usuario

El comando recibe el correo y elimina el usuario junto con los equipos, evaluaciones, instancias, respuestas, acciones, contexto, configuraciones de IA e integraciones que le pertenecen.

Por seguridad, primero ejecutar una vista previa:

```bash
npm run delete-user -w @termometro/api -- --mode mongo --email usuario@ejemplo.com --dry-run
```

Para confirmar el borrado real, el correo debe repetirse exactamente en `--confirm`:

```bash
npm run delete-user -w @termometro/api -- --mode mongo \
  --email usuario@ejemplo.com --confirm usuario@ejemplo.com
```

El modo local opera sobre la carpeta de datos versionada (`usuarios.json`,
`equipos.json`, `evaluaciones.json`, `instancias.json`, `respuestas.json` y las
colecciones de IA, contexto, acciones e integraciones):

```bash
npm run delete-user -w @termometro/api -- --mode local \
  --local-dir "%APPDATA%\TermometroDeEquipo\data" --email usuario@ejemplo.com --dry-run
```

Cada escritura conserva el backup rotativo de `JsonStorage`. En MongoDB el
comando borra únicamente registros relacionados con el usuario encontrado por
correo; no elimina la base ni colecciones completas.
# Ejecución local sin MongoDB

Para una instalación local, el modo predeterminado guarda los datos en archivos JSON y no requiere servicios externos:

```powershell
npm.cmd install
npm.cmd run local
```

Abrí `http://localhost:3000`. Los datos se guardan en `%APPDATA%\TermometroDeEquipo\data` (o en `TERMOMETRO_DATA_DIR` si se configura). Para permitir respuestas desde celulares conectados a la misma Wi‑Fi, agregá `LOCAL_NETWORK=true` en `apps/api/.env`, reiniciá y usá la IP local de la computadora, por ejemplo `http://192.168.1.20:3000/responder/<id-de-ronda>`. Windows puede solicitar permiso de firewall para el puerto 3000.

