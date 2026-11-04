# Registro de huecos

```markdown
## Veredicto
[Una frase: el recorrido canónico cierra / se corta en X.]

## Recorrido visto
| Paso | Actor | ¿Cierra? | Evidencia |
|------|--------|----------|-----------|
| … | Facilitador / Integrante | sí / no / hipótesis | archivo o reproducción |

## Huecos
### H1 — [título corto]
- **Tipo:** (taxonomía)
- **Severidad:** crítico | alto | medio | bajo
- **Actor:**
- **Paso canónico:**
- **Qué pasa:**
- **Qué debería pasar para que el flujo siga:**
- **Evidencia:** archivo o reproducción. Si no hay, escribir "hipótesis".
- **Efecto en índice / participación / histórico:** ninguno | …

## Lo que sí cierra
- …

## Smoke vs primer uso
- El smoke cubre: …
- El primer uso sin seed no cubre: …

## Handoff a UX
Lista solo los huecos que un cambio de flujo o interfaz puede cerrar, en orden de severidad. Sin propuesta visual.
```

## Ejemplo de redacción

Re-verificar contra el código antes de repetir el hecho.

```markdown
### H1 — Publicar no deja el link en la mano
- **Tipo:** cierre ciego
- **Severidad:** crítico
- **Actor:** Facilitador
- **Paso canónico:** 5. Compartir `/responder/:instanciaId`
- **Qué pasa:** la publicación termina y la persona vuelve a una lista, sin el link seleccionado para copiar.
- **Qué debería pasar para que el flujo siga:** al confirmar, el link queda visible, copiable, y el siguiente paso es compartirlo.
- **Evidencia:** hipótesis hasta citar el modal o la pantalla de publicar.
- **Efecto en índice / participación / histórico:** la instancia puede existir y nadie responde; participación queda en cero sin que se entienda por qué.
```
