# Publicación por Release

Termómetro de Equipo se distribuye de forma profesional con **GitHub Releases**.
El código vive en `main`; el instalador Windows solo se publica al crear un tag semver.

## Modelo

```text
main (código)
   │
   │  tag vX.Y.Z  (debe coincidir con apps/desktop/package.json)
   ▼
GitHub Actions → build + tests → instalador NSIS
   │
   ▼
GitHub Release (assets .exe / .blockmap / latest.yml)
```

- Push a `main` → CI de build/tests (no publica instalador).
- Tag `vX.Y.Z` → workflow **Release desktop** publica el Release.

## Primer release (sin certificado todavía)

Podés publicar el instalador sin firma. Windows puede mostrar advertencia de
editor desconocido; la auto-actualización **no** se habilita hasta tener certificado.

```powershell
cd "c:\Users\lpleo\OneDrive\Escritorio\Programación\Trabajo\IBM\termometro-de-equipo"

# 1) Asegurate de estar al día en main
git checkout main
git pull origin main

# 2) La versión del desktop debe ser la del tag (hoy: 0.0.6)
Get-Content apps/desktop/package.json | Select-String '"version"'

# 3) Si necesitás subir versión:
# npm version 0.0.7 -w @termometro/desktop --no-git-tag-version
# git add apps/desktop/package.json package-lock.json
# git commit -m "Bump desktop a 0.0.7."
# git push origin main

# 4) Tag anotado y push del tag (dispara el release)
git tag -a v0.0.6 -m "Release desktop 0.0.6"
git push origin v0.0.6
```

Seguí el workflow en:
https://github.com/lpleoped/termometro/actions

Cuando termine, el instalador queda en:
https://github.com/lpleoped/termometro/releases

## Release con firma y auto-update (recomendado para producción)

1. Obtené un certificado de firma de código Windows (PFX).
2. En el repo → Settings → Secrets and variables → Actions, creá:
   - `CSC_LINK`: contenido del PFX en Base64
   - `CSC_KEY_PASSWORD`: password del PFX
3. En el próximo tag, el workflow detecta el secreto, firma el instalador y
   configura el canal:

```text
https://github.com/lpleoped/termometro/releases/latest/download/
```

Eso habilita `electron-updater` en la app empaquetada.

Para cargar el secreto desde PowerShell:

```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\segura\code-signing.pfx"))
# Con GitHub CLI (si lo tenés):
# gh secret set CSC_LINK --repo lpleoped/termometro --body $b64
# gh secret set CSC_KEY_PASSWORD --repo lpleoped/termometro
```

Sin CLI: pegá el Base64 en la UI de Secrets del repo.

## Reglas

- Nunca subas `.exe`, `release/` ni certificados al git.
- Nunca pongas secretos en el código.
- El tag `vX.Y.Z` **debe** coincidir con `apps/desktop/package.json`.
- No reutilices un tag: si falló el build, corregí en `main` y publicá `vX.Y.Z+1`.

## Verificar un release

1. Actions del tag en verde.
2. Assets presentes en el Release.
3. Instalar el `.exe` en una máquina limpia / usuario sin Node.
4. Abrir la app, crear datos de prueba, cerrar y reabrir (persistencia local).
