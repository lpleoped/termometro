---
name: seguir-plan
description: >-
  Ejecuta el plan activo de a un punto y se detiene para que el siguiente
  se dispare solo. Usar cuando el usuario pida seguir el plan, continuar
  el plan, el siguiente punto, o cuando el mensaje cite el plan activo
  o la skill seguir-plan.
---

# Seguir plan

El plan vive en `.cursor/plan-activo.md`. Un turno hace un solo punto.

## Reglas

1. Leé `.cursor/plan-activo.md`.
2. Si `activo` es `false`, no ejecutes puntos. Pedí que lo pasen a `true` cuando la lista esté escrita.
3. Tomá el primer `- [ ]`. Saltá los `- [x]`. Si antes aparece un `- [!]`, parate y mostrá la línea `bloqueo:` de debajo.
4. Hacé solamente ese punto.
5. Si lo completás, cambiá `[ ]` por `[x]`.
6. Si no podés completarlo, cambiá `[ ]` por `[!]` y agregá debajo una línea `bloqueo:` con el motivo. No inventes un atajo.
7. Parate. No empieces el punto siguiente y no pidas permiso para seguir.

El primer punto lo pide la persona. Los demás llegan solos al cerrar el turno, mientras `activo` siga en `true`.
