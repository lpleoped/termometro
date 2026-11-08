# Contribuir a Termómetro de Equipo

¡Gracias por tu interés en contribuir! Este documento explica cómo configurar el proyecto, enviar cambios y entender el flujo de trabajo.

## Configuración local

### Requisitos

- **Node.js 20+** ([nodejs.org](https://nodejs.org/))
- **Git**
- **Windows** (solo para compilar el instalador desktop)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/lpleoped/termometro.git
cd termometro

# Instalar dependencias (npm workspaces instala todo automáticamente)
npm ci

# Generar secretos de desarrollo
npm run setup:dev

# Compilar el proyecto
npm run build
```

El proyecto usa **npm workspaces** con tres módulos principales:
- `apps/api` — Backend (Express + MongoDB/JSON)
- `apps/web` — Frontend (React + Vite)
- `apps/desktop` — Electron wrapper
- `packages/shared` — Código compartido

## Desarrollo

### Ejecutar en modo desarrollo

```bash
# API + Web en modo dev (hot reload)
npm run dev

# Solo API
npm run dev:api

# Solo web
npm run dev:web

# Desktop (compila todo y abre Electron)
npm run desktop
```

### Ejecutar tests

```bash
# Todos los tests principales
npm run build
npm run test:storage -w @termometro/api
npm run test:repositories -w @termometro/api
npm run test:local-flow -w @termometro/api
npm run test -w @termometro/desktop

# Test individual
npm run test:storage -w @termometro/api
```

**CI ejecuta estos tests automáticamente** en cada PR. Todos deben pasar antes de hacer merge.

## Flujo de trabajo

### 1. Crear una rama

```bash
# Actualizar main
git checkout main
git pull origin main

# Crear rama descriptiva
git checkout -b feature/nombre-descriptivo
# o: fix/descripcion-del-bug
```

**Convención de nombres de ramas:**
- `feature/` — Nueva funcionalidad
- `fix/` — Corrección de bugs
- `docs/` — Solo documentación
- `refactor/` — Refactorización sin cambios funcionales
- `test/` — Agregar o mejorar tests

### 2. Hacer commits

Usamos commits descriptivos en español:

```bash
git add .
git commit -m "feat: Agregar validación de email en registro

- Valida formato con regex
- Mensaje de error claro
- Test de regresión incluido"
```

**Convención de commits:**
- `feat:` — Nueva funcionalidad
- `fix:` — Corrección de bug
- `docs:` — Solo documentación
- `refactor:` — Refactorización
- `test:` — Tests
- `chore:` — Configuración, dependencias

### 3. Push y Pull Request

```bash
# Subir rama
git push -u origin feature/nombre-descriptivo
```

Abrí un **Pull Request** en GitHub:
- **Título claro** describiendo el cambio
- **Descripción** explicando qué, por qué y cómo
- Completá el checklist del template
- Esperá la **revisión** y que el **CI pase** (verde ✅)

**No se permiten pushes directos a `main`**. Todo cambio debe pasar por PR + revisión + CI.

### 4. Revisión y merge

- El mantenedor revisará tu PR
- Puede solicitar cambios
- Una vez aprobado y con CI verde, se hace merge
- Las ramas se borran automáticamente después del merge

## Releases

### Proceso de release (solo mantenedor)

1. **Abrir PR con bump de versión:**
   ```bash
   # Editar apps/desktop/package.json
   # Cambiar "version": "0.0.8" → "0.0.9"
   
   git commit -m "chore: Bump version to 0.0.9"
   git push
   ```

2. **Merge del PR a main**

3. **Crear y pushear el tag:**
   ```bash
   git checkout main
   git pull origin main
   git tag -a v0.0.9 -m "Release desktop 0.0.9"
   git push origin v0.0.9
   ```

4. **El workflow `release-desktop.yml` se dispara automáticamente:**
   - Verifica que el tag coincida con `apps/desktop/package.json`
   - Ejecuta tests
   - Compila el instalador Windows
   - Publica el release en GitHub con el `.exe`

**Requisitos:**
- El tag debe seguir semver: `vX.Y.Z` (ej: `v0.0.9`)
- `apps/desktop/package.json` debe tener la versión exacta (sin la `v`)
- Solo se publica desde el repositorio oficial `lpleoped/termometro`

### Actualización automática

Si el instalador fue firmado con certificado de código (secretos `CSC_LINK` / `CSC_KEY_PASSWORD` configurados), el canal de auto-update se habilita automáticamente.

## Trabajar desde un fork

### Configurar fork

```bash
# Clonar tu fork
git clone https://github.com/tu-usuario/termometro.git
cd termometro

# Agregar upstream
git remote add upstream https://github.com/lpleoped/termometro.git

# Instalar y configurar
npm ci
npm run setup:dev
```

### Mantener el fork actualizado

```bash
# Traer cambios del repositorio original
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Limitaciones en forks

**No funcionará en forks:**
- **Publicación de releases**: El workflow `release-desktop.yml` solo publica desde `lpleoped/termometro`
- **Firma de código**: Los secretos `CSC_LINK` / `CSC_KEY_PASSWORD` son privados del repo oficial
- **Auto-update**: Sin firma, el instalador no habilita actualizaciones automáticas

**Sí funciona en forks:**
- CI completo (tests)
- Desarrollo local
- Abrir PRs al repositorio original

### Enviar cambios desde un fork

1. Hacé tus cambios en una rama del fork
2. Pusheá a tu fork: `git push origin feature/mi-cambio`
3. Abrí un PR desde tu fork al repositorio original
4. El CI del repo original ejecutará los tests
5. Esperá revisión y merge

## Seguridad

**No reportes vulnerabilidades en issues públicos.**

Usá [GitHub Security Advisories](https://github.com/lpleoped/termometro/security/advisories/new) para reportes privados.

Lee [SECURITY.md](SECURITY.md) para más detalles.

## Dudas o problemas

- Abrí un **issue** si encontrás un bug o tenés una sugerencia
- Consultá la documentación en `docs/`
- Revisá los PRs anteriores para ver ejemplos

¡Gracias por contribuir! 🎉
