# Política de Seguridad

Termómetro de Equipo toma la seguridad con seriedad. Este documento explica cómo reportar vulnerabilidades de forma responsable.

## Versiones soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

Siempre recomendamos usar la última versión publicada. Las correcciones de seguridad se lanzan lo antes posible en nuevas versiones.

## Reportar una vulnerabilidad

**No reportes vulnerabilidades de seguridad en issues públicos de GitHub.**

### Reporte privado (recomendado)

Usá [GitHub Security Advisories](https://github.com/lpleoped/termometro/security/advisories/new) para reportar vulnerabilidades de forma privada.

**¿Cómo funciona?**
1. Creás un Security Advisory privado
2. El mantenedor lo revisa y coordina la corrección
3. Se publica el fix y el advisory se hace público
4. Recibís crédito por el descubrimiento (si lo deseás)

### Reporte alternativo

Si no podés usar Security Advisories, contactá al mantenedor:
- **GitHub**: [@lpleoped](https://github.com/lpleoped)
- **Email**: Disponible en el perfil de GitHub

### Información a incluir

- **Descripción detallada** del problema
- **Pasos para reproducir** la vulnerabilidad
- **Impacto potencial** (qué puede hacer un atacante)
- **Versión afectada** (número de release o commit)
- **Sugerencias de mitigación** (opcional)

## Alcance

Agradecemos reportes sobre:

- **Autenticación y autorización**: Bypass de login, escalación de privilegios
- **Inyecciones**: SQL, NoSQL, XSS, SSRF, command injection
- **Exposición de datos**: Fugas de información sensible, tokens, secretos
- **Control de acceso**: Acceso no autorizado a recursos de otros usuarios
- **Configuración insegura**: Secretos hardcodeados, permisos incorrectos
- **Dependencias**: Vulnerabilidades conocidas en librerías de terceros

## Respuesta

- **Confirmación**: Dentro de las 48 horas
- **Evaluación inicial**: 5 días hábiles
- **Corrección**: Según criticidad (crítico: días; medio: semanas)
- **Publicación**: Después de la corrección, con advisory público

Trabajamos para resolver vulnerabilidades rápidamente y mantener informados a los reportantes.

## Reconocimiento

Los reportantes de vulnerabilidades válidas serán reconocidos públicamente en:
- El Security Advisory correspondiente
- Las notas del release que contiene el fix

Podés solicitar permanecer anónimo si lo preferís.

## Configuración de producción

### Secretos requeridos

Configurar como secretos del entorno de ejecución:

```env
MONGO_URI=mongodb://...
JWT_SECRET=<al menos 32 caracteres aleatorios>
AI_CREDENTIAL_SECRET=<al menos 32 caracteres aleatorios>
INTEGRATION_ENCRYPTION_KEY=<al menos 32 caracteres aleatorios>
```

**No commitear secretos reales al repositorio**. Para desarrollo local, `npm run setup:dev` genera valores seguros automáticamente.

### Límites de confianza

- La interfaz web y cualquier cliente HTTP son no confiables
- Los textos de feedback y contexto son datos, no instrucciones
- El backend es responsable de autenticación, autorización y cifrado
- Las API keys nunca deben exponerse al frontend
- Los secretos del despliegue deben configurarse fuera del repositorio

### Invariantes de seguridad

- Todas las rutas privadas requieren autenticación válida
- Las mutaciones de equipos y contexto verifican ownership
- Las API keys se cifran en reposo con `INTEGRATION_ENCRYPTION_KEY`
- El contexto enviado a la IA está limitado por alcance y presupuesto
- Los feedbacks conservan las reglas de anonimato configuradas

## Estado del proyecto

Termómetro de Equipo es un proyecto open source en estado MVP/beta. Para uso empresarial con información sensible, se recomienda:

- Auditoría de seguridad completa
- Rate limiting en endpoints públicos
- Roles de miembros con permisos granulares
- Política de retención de datos
- Monitoreo y alertas de seguridad
- Revisión periódica de dependencias
- Secret manager enterprise (no variables de entorno)

## Limitaciones conocidas

No se consideran vulnerabilidades:
- Resultados interpretativos de la IA (claramente marcados como sugerencias)
- Problemas de UX o usabilidad sin impacto en seguridad

Sí es reportable:
- Exposición de secretos o API keys
- Bypass de autenticación o autorización
- Pérdida de aislamiento entre equipos o usuarios
- Envío no controlado de datos a terceros
- Inyecciones (NoSQL, XSS, SSRF, etc.)
