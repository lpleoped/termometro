# Plantillas — liderazgo del equipo

Ítems originales. No son el MLQ ni otra escala publicada. Miden la **función** de liderazgo que el equipo percibe, no a una persona para un legajo. Likert del producto: **1 bajo, 5 alto**. Pesos suman 100.

Al leer un resultado: participación → sección → índice. El número no autoriza una sanción ni un ranking de jefes. El debrief es sobre la función, con el equipo.

“Quien lidera” en la descripción es la función formal. Las plantillas de liderazgo compartido hablan del equipo, no de esa función: no mezclar las dos lecturas en una misma sección.

---

## Liderazgo cotidiano

**Propósito:** ver cómo se viven rumbo, feedback, consideración y autonomía en el trabajo de todos los días.

**Por qué estos pesos:** la claridad de rumbo pesa más (30) porque ordena el resto. Feedback y consideración (25) son el vínculo de la función con el trabajo real. La autonomía (20) dice si el equipo solo ejecuta.

**No concluir:** un estilo (“es transformacional”) ni un juicio sobre la persona. Es la experiencia agregada del equipo.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Claridad de rumbo | 30 | Prioridad, buen resultado y cambios explicados | ¿Qué está pidiendo el equipo adivinar? |
| Feedback útil | 25 | Devolución a tiempo, de lo que funciona y del error | ¿La devolución llega cuando todavía se puede usar? |
| Consideración | 25 | Escucha y margen para decir que no se llega | ¿Qué no se puede decir hacia arriba? |
| Autonomía | 20 | El equipo decide el cómo | ¿Qué decisión sube de más? |

```json
{
  "titulo": "Liderazgo cotidiano",
  "descripcion": "Cómo el equipo vive el rumbo, la devolución, la escucha y la autonomía. No evalúa a una persona por su nombre. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Claridad de rumbo",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "LC01",
          "texto": "Prioridades claras de esta etapa",
          "descripcion": "Quien lidera deja claro qué va primero ahora."
        },
        {
          "id": "LC02",
          "texto": "Buen resultado definido",
          "descripcion": "El equipo sabe cómo se ve un resultado bien hecho."
        },
        {
          "id": "LC03",
          "texto": "Cambios de rumbo explicados",
          "descripcion": "Si la meta se mueve, se explica antes de exigirla."
        }
      ]
    },
    {
      "titulo": "Feedback útil",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "LC04",
          "texto": "Devolución a tiempo para corregir",
          "descripcion": "El comentario llega mientras todavía se puede cambiar el trabajo."
        },
        {
          "id": "LC05",
          "texto": "También se marca lo que funcionó",
          "descripcion": "La devolución incluye qué salió bien, no solo qué falló."
        },
        {
          "id": "LC06",
          "texto": "Error conversable",
          "descripcion": "Se puede hablar de un error con quien lidera."
        }
      ]
    },
    {
      "titulo": "Consideración",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "LC07",
          "texto": "Escucha antes de decidir",
          "descripcion": "Quien lidera escucha a la persona antes de decidir sobre su trabajo."
        },
        {
          "id": "LC08",
          "texto": "La situación de la persona cuenta",
          "descripcion": "No se mira solo la entrega; se tiene en cuenta cómo está quien la hace."
        },
        {
          "id": "LC09",
          "texto": "Avisar que no se llega",
          "descripcion": "Decir a tiempo que no se llega no trae un costo después."
        }
      ]
    },
    {
      "titulo": "Autonomía",
      "ponderacion": 20,
      "indicadores": [
        {
          "id": "LC10",
          "texto": "Decisión sobre el cómo",
          "descripcion": "El equipo define la forma de hacer el trabajo, no solo ejecuta el qué."
        },
        {
          "id": "LC11",
          "texto": "Confianza en el criterio de quien hace",
          "descripcion": "Se confía en el criterio de la persona que hace el trabajo."
        },
        {
          "id": "LC12",
          "texto": "Avance sin permiso en cada paso",
          "descripcion": "El trabajo avanza sin tener que pedir autorización por cada decisión chica."
        }
      ]
    }
  ]
}
```

---

## Liderazgo que habilita

**Propósito:** ver si quien lidera deja hablar, tratar el error como aprendizaje y respaldar al equipo cuando el contexto aprieta.

**Por qué estos pesos:** voz y error (35) son el núcleo de un liderazgo que habilita. El respaldo (30) es la prueba cuando hay presión de afuera.

**No concluir:** que “falta seguridad psicológica del equipo”. Eso, entre pares, es la plantilla de clima psicológico. Acá el objeto es la función de liderazgo.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Voz | 35 | Malas noticias y disenso hacia quien lidera | ¿Qué mala noticia llega tarde? |
| Error y aprendizaje | 35 | El error informado no se usa en contra | ¿Qué fallo no se cuenta? |
| Respaldo | 30 | Presencia y sostén hacia afuera | ¿Dónde el equipo queda solo ante otra área? |

```json
{
  "titulo": "Liderazgo que habilita",
  "descripcion": "Si se puede hablar, aprender del error y contar con respaldo de quien lidera. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Voz",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "LH01",
          "texto": "Malas noticias tempranas",
          "descripcion": "Quien lidera prefiere enterarse de un problema temprano."
        },
        {
          "id": "LH02",
          "texto": "Disenso sin costo",
          "descripcion": "Disentir con quien lidera no se paga después."
        },
        {
          "id": "LH03",
          "texto": "Pregunta que recibe respuesta",
          "descripcion": "Una pregunta incómoda recibe respuesta."
        }
      ]
    },
    {
      "titulo": "Error y aprendizaje",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "LH04",
          "texto": "Error contado a tiempo",
          "descripcion": "Contar un error a tiempo no se usa en contra de la persona."
        },
        {
          "id": "LH05",
          "texto": "Aprendizaje después del fallo",
          "descripcion": "Después de un fallo, queda claro qué hay que cambiar."
        },
        {
          "id": "LH06",
          "texto": "Crédito compartido del resultado",
          "descripcion": "Cuando sale bien, el crédito se reparte con quien hizo el trabajo."
        }
      ]
    },
    {
      "titulo": "Respaldo",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "LH07",
          "texto": "Sostén ante otras áreas",
          "descripcion": "Quien lidera sostiene al equipo cuando otra área presiona."
        },
        {
          "id": "LH08",
          "texto": "Presencia en lo difícil",
          "descripcion": "En un problema grave, quien lidera está."
        },
        {
          "id": "LH09",
          "texto": "Respuesta a un pedido del equipo",
          "descripcion": "Si el equipo pide una decisión o un recurso, hay respuesta."
        }
      ]
    }
  ]
}
```

---

## Liderazgo compartido

**Propósito:** ver cuánto liderazgo está en el equipo: influencia entre pares, decisiones del día a día y respaldo lateral. No mide a quien lidera en forma formal.

**Por qué estos pesos:** influencia y decisión (35) describen si el liderazgo está repartido. El respaldo lateral (30) dice si ese reparto se sostiene entre personas.

**No concluir:** que sobra o falta la jefatura formal. Una sección baja dice que esa parte no está en el equipo; no dice quién debería mandar.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Influencia entre pares | 35 | Una idea pesa aunque no venga de arriba | ¿Qué idea buena se frenó por no ser de quien lidera? |
| Decisión distribuida | 35 | Lo operativo se resuelve en el equipo | ¿Qué decisión chica sube siempre? |
| Respaldo lateral | 30 | Cobertura, feedback y roce entre pares | ¿Qué depende todavía de que baje una orden? |

```json
{
  "titulo": "Liderazgo compartido",
  "descripcion": "Cuánto liderazgo hay entre pares: ideas, decisiones y respaldo. No evalúa a quien lidera en forma formal. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Influencia entre pares",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "LS01",
          "texto": "La idea pesa venga de quien venga",
          "descripcion": "Una buena idea mueve al equipo aunque no venga de quien lidera."
        },
        {
          "id": "LS02",
          "texto": "Consulta real entre pares",
          "descripcion": "Las personas se consultan de verdad antes de seguir."
        },
        {
          "id": "LS03",
          "texto": "Iniciativa que no espera orden",
          "descripcion": "Alguien del equipo puede proponer un cambio y empujarlo."
        }
      ]
    },
    {
      "titulo": "Decisión distribuida",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "LS04",
          "texto": "Lo cotidiano se resuelve en el equipo",
          "descripcion": "Las decisiones del día a día no se escalan todas."
        },
        {
          "id": "LS05",
          "texto": "Criterio compartido para elegir",
          "descripcion": "El equipo sabe con qué criterio se elige cuando hay opciones."
        },
        {
          "id": "LS06",
          "texto": "Quien ejecuta opina antes de cerrar",
          "descripcion": "La persona que hace el trabajo participa de la decisión que lo afecta."
        }
      ]
    },
    {
      "titulo": "Respaldo lateral",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "LS07",
          "texto": "Cobertura entre compañeros",
          "descripcion": "Los pares se cubren el trabajo urgente sin esperar una orden."
        },
        {
          "id": "LS08",
          "texto": "Devolución entre pares",
          "descripcion": "El feedback también circula entre compañeros, no solo desde arriba."
        },
        {
          "id": "LS09",
          "texto": "Roce que el equipo toma",
          "descripcion": "Un roce entre dos personas lo trabaja el equipo."
        }
      ]
    }
  ]
}
```

---

## Equidad y crecimiento

**Propósito:** ver si quien lidera reparte la carga con un criterio visible, da crédito y abre crecimiento.

**Por qué estos pesos:** carga y crecimiento (35) son los dos efectos durables. El reconocimiento (30) es la señal cercana de que el criterio se ve.

**No concluir:** favoritismos comprobados ni un plan de carrera. Es cómo el equipo percibe esas tres funciones.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Equidad de carga | 35 | Exigencia pareja y excepciones explicadas | ¿Quién carga de más sin que se diga por qué? |
| Reconocimiento | 30 | Crédito al aporte, también al trabajo de sostén | ¿Qué trabajo nadie nombra? |
| Crecimiento | 35 | Desarrollo, desafío y rotación de oportunidades | ¿Quién no recibe un desafío nuevo hace tiempo? |

```json
{
  "titulo": "Equidad y crecimiento",
  "descripcion": "Cómo el equipo vive el reparto, el crédito y las oportunidades que abre quien lidera. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Equidad de carga",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "LE01",
          "texto": "Reparto con criterio visible",
          "descripcion": "Quien lidera reparte el trabajo con un criterio que el equipo puede explicar."
        },
        {
          "id": "LE02",
          "texto": "Exigencia pareja",
          "descripcion": "Responsabilidades parecidas tienen una exigencia parecida."
        },
        {
          "id": "LE03",
          "texto": "Excepciones explicadas",
          "descripcion": "Si alguien tiene una carga distinta, el motivo se entiende."
        }
      ]
    },
    {
      "titulo": "Reconocimiento",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "LE04",
          "texto": "Crédito a quien hizo el trabajo",
          "descripcion": "El reconocimiento nombra a la persona que aportó."
        },
        {
          "id": "LE05",
          "texto": "Trabajo de sostén también visto",
          "descripcion": "Se reconoce el trabajo que sostiene al equipo, no solo lo que se presenta."
        },
        {
          "id": "LE06",
          "texto": "Mérito dicho delante del equipo",
          "descripcion": "Lo que salió bien se nombra con el equipo presente."
        }
      ]
    },
    {
      "titulo": "Crecimiento",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "LE07",
          "texto": "Conversación sobre desarrollo",
          "descripcion": "Hay espacio para hablar de hacia dónde quiere crecer cada persona."
        },
        {
          "id": "LE08",
          "texto": "Trabajo que estira",
          "descripcion": "El trabajo incluye desafíos nuevos, no solo lo de siempre."
        },
        {
          "id": "LE09",
          "texto": "Oportunidades que rotan",
          "descripcion": "Liderar un tema o aprender algo nuevo no queda siempre en las mismas personas."
        }
      ]
    }
  ]
}
```

---

## Pulso de liderazgo

**Propósito:** un chequeo corto de rumbo y de confianza en la función de liderazgo. No separa consideración, autonomía ni liderazgo compartido.

**Por qué 50/50:** se compara contra la ronda anterior. Si una mitad cae, abrir la plantilla larga (cotidiano, o la que habilita).

**No concluir:** un veredicto sobre la persona. Si la participación es baja, no usar el pulso para una conversación de desempeño.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Rumbo y feedback | 50 | Prioridad, devolución y cambios de esta etapa | ¿Qué cambió desde la ronda pasada? |
| Confianza en la función | 50 | Escucha, error conversable, respaldo y autonomía | ¿Esto es de la función formal o del equipo? |

```json
{
  "titulo": "Pulso de liderazgo",
  "descripcion": "Chequeo breve de rumbo y de confianza en quien lidera. No es una evaluación de desempeño. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Rumbo y feedback",
      "ponderacion": 50,
      "indicadores": [
        {
          "id": "PL01",
          "texto": "Prioridades claras esta semana",
          "descripcion": "Está claro qué va primero en esta semana."
        },
        {
          "id": "PL02",
          "texto": "Devolución útil y a tiempo",
          "descripcion": "El comentario sobre el trabajo llega cuando todavía sirve."
        },
        {
          "id": "PL03",
          "texto": "Buen resultado reconocible",
          "descripcion": "El equipo sabe qué cuenta como un buen resultado ahora."
        },
        {
          "id": "PL04",
          "texto": "Cambios explicados antes de exigirlos",
          "descripcion": "Si algo cambió, se explicó antes de pedir el resultado nuevo."
        }
      ]
    },
    {
      "titulo": "Confianza en la función",
      "ponderacion": 50,
      "indicadores": [
        {
          "id": "PL05",
          "texto": "Escucha real",
          "descripcion": "Quien lidera escucha antes de cerrar un tema del equipo."
        },
        {
          "id": "PL06",
          "texto": "Error que se puede hablar",
          "descripcion": "Un error se puede conversar con quien lidera."
        },
        {
          "id": "PL07",
          "texto": "Respaldo si el contexto aprieta",
          "descripcion": "Si otra área presiona, quien lidera sostiene al equipo."
        },
        {
          "id": "PL08",
          "texto": "Autonomía para el cómo",
          "descripcion": "El equipo puede decidir la forma de hacer el trabajo."
        }
      ]
    }
  ]
}
```
