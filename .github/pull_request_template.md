## Descripción

<!-- Describí brevemente qué cambia este PR y por qué -->

## Tipo de cambio

<!-- Marcá con una X las opciones que aplican -->

- [ ] Corrección de bug (fix)
- [ ] Nueva funcionalidad (feature)
- [ ] Cambio que rompe compatibilidad (breaking change)
- [ ] Refactorización (sin cambios funcionales)
- [ ] Documentación
- [ ] Tests
- [ ] Configuración o dependencias

## Checklist

- [ ] Mi código sigue el estilo del proyecto
- [ ] Ejecuté los tests localmente y todos pasan
- [ ] Agregué tests que prueban mi corrección o nueva funcionalidad
- [ ] Actualicé la documentación si es necesario
- [ ] Mis commits siguen la convención (feat:, fix:, docs:, etc.)
- [ ] No hay secrets, credenciales ni datos sensibles en el código

## Tests ejecutados

<!-- Marcá los tests que ejecutaste localmente -->

- [ ] `npm run build`
- [ ] `npm run test:storage -w @termometro/api`
- [ ] `npm run test:repositories -w @termometro/api`
- [ ] `npm run test:local-flow -w @termometro/api`
- [ ] `npm run test -w @termometro/desktop`

## Impacto en seguridad

<!-- ¿Este cambio tiene implicaciones de seguridad? Explicá brevemente -->

- [ ] No tiene impacto en seguridad
- [ ] Corrige una vulnerabilidad (describí abajo)
- [ ] Modifica autenticación, autorización o manejo de datos sensibles

<!-- Si hay impacto en seguridad, describí el cambio y las medidas tomadas -->

## Bump de versión (solo si aplica)

- [ ] Este PR requiere un release del desktop
- [ ] Actualicé `apps/desktop/package.json` con la nueva versión
- [ ] La versión sigue semver (X.Y.Z)

<!-- Si es un release, indicá la nueva versión y qué incluye -->

## Capturas o logs (opcional)

<!-- Si aplica, agregá capturas de pantalla, logs o ejemplos -->
