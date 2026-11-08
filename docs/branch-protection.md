# Protección de Ramas

Este documento describe la configuración recomendada para proteger la rama `main` y los tags de release en GitHub.

## Configuración de Branch Protection para `main`

### Ubicación

GitHub → Settings → Branches → Add branch protection rule (o Rules → Rulesets → New ruleset)

### Opción 1: Branch Protection Rules (clásico)

**Branch name pattern:** `main`

#### Reglas requeridas

- [x] **Require a pull request before merging**
  - [x] Require approvals: 1 (o 0 si sos el único mantenedor)
  - [ ] Dismiss stale pull request approvals when new commits are pushed
  - [ ] Require review from Code Owners (opcional, útil si agregás colaboradores)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Status checks requeridos:**
    - `Build and test` (el nombre exacto del job en `ci.yml`)

- [x] **Require conversation resolution before merging** (opcional pero recomendado)

- [x] **Do not allow bypassing the above settings** (o permitir para admins si sos el único mantenedor)

- [ ] **Require linear history** (opcional — fuerza rebases o squash, no merge commits)

- [x] **Lock branch** (solo lectura para todos excepto reglas configuradas)

#### Reglas de force push y delete

- [x] **Block force pushes** (nadie puede hacer `git push --force`)
- [x] **Do not allow deletions** (nadie puede borrar la rama `main`)

### Opción 2: Rulesets (recomendado para repos nuevos)

**Ruleset name:** `Protect main`  
**Enforcement status:** Active  
**Target branches:** Include default branch

#### Rules

- **Restrict deletions**: Enabled
- **Restrict force pushes**: Enabled
- **Require pull request before merging**:
  - Required approvals: 1 (o 0 si sos solo)
  - Dismiss stale reviews: No
  - Require approval from code owners: No (o Yes si hay múltiples mantenedores)
- **Require status checks**:
  - Required checks:
    - **`Build and test`** (el nombre exacto del job en `.github/workflows/ci.yml`)
  - Require branches to be up to date: Yes
- **Block force pushes**: Yes

#### Bypass rules

- **Allow specified actors to bypass**: (opcional)
  - Si sos el único mantenedor, podés agregarte como bypass para emergencias
  - Si hay múltiples mantenedores, no configurar bypass

## Protección de Tags de Release

Los tags `v*.*.*` solo deben crearse desde `main` después del merge y con la versión correcta.

### Opción: Tag Protection Rules

**Tag name pattern:** `v*.*.*`

- [x] **Only allow repository administrators to create matching tags**

Esto previene que:
- Colaboradores creen tags sin supervisión
- Forks intenten publicar releases (combinado con `if: github.repository == 'lpleoped/termometro'` en `release-desktop.yml`)
- Se creen tags accidentalmente desde ramas incorrectas

### Opción: Tag Ruleset (recomendado)

**Ruleset name:** `Protect release tags`  
**Enforcement status:** Active  
**Target tags:** Include by pattern: `v*.*.*`

#### Rules

- **Restrict deletions**: Enabled
- **Restrict updates**: Enabled (no permitir force push de tags)
- **Require a pull request before creating**: No (los tags se crean después del merge)

#### Bypass rules

- **Allow specified actors to bypass**:
  - Solo el mantenedor principal (`@lpleoped`)
  - O: Repository administrators only

## Status Checks Requeridos

### Nombres exactos de los checks de CI

El workflow `.github/workflows/ci.yml` define un job llamado:

- **Job name:** `build-and-test`
- **Display name (el que aparece en GitHub):** `Build and test`

**En la configuración de branch protection, usar:**

```
Build and test
```

Este es el nombre exacto que aparece en la lista de "Status checks" cuando configurás la protección.

### Cómo verificar el nombre

1. Abrí un PR de prueba
2. Esperá que el CI termine
3. En el PR, fijate en la sección "Checks" — el nombre mostrado es el que debés usar
4. Alternativamente, en Settings → Branches → Branch protection, cuando agregás un status check, GitHub autocompleta con los checks que vio recientemente

## Políticas de Bypass para Mantenedor Solo

Si sos el único mantenedor del proyecto:

- **Podés configurar bypass para admins** para emergencias (hotfix crítico)
- Pero **seguí creando PRs normalmente** — el bypass es solo para casos excepcionales
- Los status checks (CI) deben pasar siempre, incluso con bypass

Si hay múltiples colaboradores:

- **No configurar bypass** — todos pasan por el mismo flujo
- El mantenedor aprueba los PRs de otros
- Los PRs del mantenedor requieren revisión externa (o auto-aprobación con política acordada)

## Verificación

Después de configurar las reglas:

1. Intentá hacer push directo a `main` — debe fallar
2. Creá un PR de prueba
3. Verificá que el check "Build and test" aparece como requerido
4. Intentá hacer merge antes de que el CI termine — debe bloquearse
5. Intentá crear un tag `vX.Y.Z` desde una rama que no es `main` — debe fallar o no disparar release

## Recursos

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
