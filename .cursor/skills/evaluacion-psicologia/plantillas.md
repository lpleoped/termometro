# Plantillas — clima psicológico del equipo

Ítems originales. No son escalas publicadas. Likert del producto: **1 bajo, 5 alto** del aspecto. Pesos suman 100. Copiar el JSON tal cual o adaptar el contexto sin cambiar el constructo.

Al leer un resultado: participación → sección → índice. El índice tapa compensaciones.

---

## Clima psicológico del equipo

**Propósito:** ver si el equipo puede hablar, confiar, sostenerse y sentir pertenencia.

**Por qué estos pesos:** la seguridad para hablar pesa más (30) porque sin ella el resto se responde con deseabilidad. Cohesión y confianza van parejas (25). Pertenencia cierra (20): importa y suele moverse más lento.

**No concluir:** un diagnóstico de personas. Una sección baja es clima de ese aspecto.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Seguridad para hablar | 30 | Seguridad psicológica (percepción compartida de que discrepar y errar no castiga) | ¿Qué tema hoy no se dice en la sala? |
| Cohesión | 25 | Cohesión de tarea y social, separadas en ítems | ¿Nos une la meta, el vínculo, o ninguno? |
| Confianza | 25 | Cumplimiento de acuerdos e integridad de la información | ¿Dónde se corta la palabra o el dato? |
| Pertenencia | 20 | Lugar propio en el equipo | ¿Quién queda al margen del trabajo real? |

```json
{
  "titulo": "Clima psicológico del equipo",
  "descripcion": "Cómo está el equipo para hablar, confiar, sostenerse y pertenecer. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Seguridad para hablar",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "CP01",
          "texto": "Libertad para plantear un problema",
          "descripcion": "Decir que algo no cierra, sin quedar expuesto delante del equipo."
        },
        {
          "id": "CP02",
          "texto": "Trato del error como aprendizaje",
          "descripcion": "Cuando alguien se equivoca, el equipo lo usa para aprender."
        },
        {
          "id": "CP03",
          "texto": "Pedir ayuda sin costo",
          "descripcion": "Pedir ayuda no se toma como falta de capacidad."
        },
        {
          "id": "CP04",
          "texto": "Voz aunque no haya acuerdo",
          "descripcion": "Se puede decir lo que uno piensa aunque no coincida con la mayoría."
        }
      ]
    },
    {
      "titulo": "Cohesión",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "CP05",
          "texto": "Unión cuando el trabajo aprieta",
          "descripcion": "El equipo se mantiene junto si la entrega se pone difícil."
        },
        {
          "id": "CP06",
          "texto": "Respaldo para cumplir lo acordado",
          "descripcion": "Las personas se cubren para terminar lo que el equipo se comprometió a hacer."
        },
        {
          "id": "CP07",
          "texto": "Deseo de seguir en este equipo",
          "descripcion": "Hay ganas de seguir trabajando con estas mismas personas."
        },
        {
          "id": "CP08",
          "texto": "Logros vividos como del equipo",
          "descripcion": "Lo que sale bien se reconoce como del equipo, no solo de una persona."
        }
      ]
    },
    {
      "titulo": "Confianza",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "CP09",
          "texto": "Cumplimiento de los acuerdos",
          "descripcion": "Se puede contar con que lo acordado se hace."
        },
        {
          "id": "CP10",
          "texto": "Información que circula",
          "descripcion": "Lo importante se dice y no queda guardado en un grupo chico."
        },
        {
          "id": "CP11",
          "texto": "Mismo respeto en ausencia",
          "descripcion": "De las personas se habla igual cuando no están."
        },
        {
          "id": "CP12",
          "texto": "Cobertura ante una ausencia",
          "descripcion": "Si alguien falta, el resto cubre lo urgente sin reclamo."
        }
      ]
    },
    {
      "titulo": "Pertenencia",
      "ponderacion": 20,
      "indicadores": [
        {
          "id": "CP13",
          "texto": "Sentido de lugar",
          "descripcion": "Las personas sienten que este equipo es un lugar propio."
        },
        {
          "id": "CP14",
          "texto": "Aporte claro de cada quien",
          "descripcion": "Cada persona sabe cuál es su parte en el trabajo común."
        },
        {
          "id": "CP15",
          "texto": "Entrada real de quien llega",
          "descripcion": "Alguien nuevo entra al trabajo de verdad, no queda al margen."
        },
        {
          "id": "CP16",
          "texto": "Orgullo de pertenecer",
          "descripcion": "Hay orgullo de formar parte de este equipo."
        }
      ]
    }
  ]
}
```

---

## Carga y sostenibilidad

**Propósito:** ver si el ritmo de trabajo se puede sostener, con claridad, recuperación y apoyo. No mide burnout clínico.

**Por qué estos pesos:** la carga sostenible pesa más (30) porque es el fenómeno central. Claridad y recuperación (25) explican si la carga es manejable o solo se aguanta. El apoyo (20) es el amortiguador.

**No concluir:** “alguien está quemado”. Es percepción del equipo sobre el trabajo.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Carga sostenible | 30 | Exigencia que se puede mantener | ¿Qué trabajo sobra o llega siempre tarde? |
| Claridad | 25 | Expectativa y prioridad conocidas | ¿Qué está pidiendo el equipo adivinar? |
| Recuperación | 25 | Bajada real después del pico | ¿Cuándo fue la última semana que aflojó? |
| Apoyo | 20 | Redistribución y alguien con quien hablar | ¿A quién se le acumula y nadie lo mueve? |

```json
{
  "titulo": "Carga y sostenibilidad",
  "descripcion": "Si el ritmo del equipo se puede sostener. No es un diagnóstico de salud. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Carga sostenible",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "CS01",
          "texto": "Ritmo que se puede sostener",
          "descripcion": "La cantidad de trabajo se aguanta semana a semana."
        },
        {
          "id": "CS02",
          "texto": "Tiempo para hacer las cosas con cuidado",
          "descripcion": "Hay margen para trabajar bien, no solo para entregar."
        },
        {
          "id": "CS03",
          "texto": "Urgencia como excepción",
          "descripcion": "Lo urgente no es la forma habitual de trabajar."
        }
      ]
    },
    {
      "titulo": "Claridad",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "CS04",
          "texto": "Expectativa clara del propio trabajo",
          "descripcion": "Cada persona sabe qué se espera de lo que hace."
        },
        {
          "id": "CS05",
          "texto": "Prioridades conocidas",
          "descripcion": "El equipo sabe qué va primero."
        },
        {
          "id": "CS06",
          "texto": "Aviso cuando cambia el rumbo",
          "descripcion": "Si el rumbo cambia, el equipo se entera antes de tener que adivinarlo."
        }
      ]
    },
    {
      "titulo": "Recuperación",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "CS07",
          "texto": "Bajada después de un pico",
          "descripcion": "Después de una semana fuerte, el ritmo puede bajar."
        },
        {
          "id": "CS08",
          "texto": "Desconexión respetada",
          "descripcion": "El tiempo fuera del trabajo se respeta."
        },
        {
          "id": "CS09",
          "texto": "Pausa sin costo",
          "descripcion": "Pedir una pausa no se paga después."
        }
      ]
    },
    {
      "titulo": "Apoyo",
      "ponderacion": 20,
      "indicadores": [
        {
          "id": "CS10",
          "texto": "Reparto si alguien está saturado",
          "descripcion": "Si una persona no da abasto, el equipo mueve trabajo."
        },
        {
          "id": "CS11",
          "texto": "Con quién decir que pesa",
          "descripcion": "Hay alguien del equipo con quien decir que el trabajo está pesado."
        },
        {
          "id": "CS12",
          "texto": "Cansancio visto a tiempo",
          "descripcion": "El equipo nota el agotamiento antes de que alguien deje de poder."
        }
      ]
    }
  ]
}
```

---

## Conflicto y reparación

**Propósito:** separar el desacuerdo que mejora el trabajo del roce que daña, y ver si después se repara.

**Por qué estos pesos:** el desacuerdo de tarea pesa más (40) porque es el aspecto que se quiere poder tener. El respeto (35) dice si ese desacuerdo es seguro. La reparación (25) dice si el equipo vuelve a trabajar junto.

**No concluir:** que “hay conflicto” es malo. Desacuerdo alto con respeto alto es sano. Respeto bajo no se compensa con un índice global lindo. No señalar a una persona como el problema.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Desacuerdo de tarea | 40 | Debate de ideas que no expulsa | ¿Qué decisión evitamos discutir? |
| Respeto en el roce | 35 | El enojo no humilla ni se va a espaldas | ¿Dónde se habla de alguien y no con alguien? |
| Reparación | 25 | Volver a trabajar juntos después | ¿Qué roce sigue abierto? |

```json
{
  "titulo": "Conflicto y reparación",
  "descripcion": "Si el equipo puede disentir, cuidarse en el roce y reparar. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Desacuerdo de tarea",
      "ponderacion": 40,
      "indicadores": [
        {
          "id": "CR01",
          "texto": "Discusión de ideas sin volverla personal",
          "descripcion": "Se puede cuestionar una idea sin que sea contra la persona."
        },
        {
          "id": "CR02",
          "texto": "Desacuerdos que mejoran la decisión",
          "descripcion": "Opinar distinto deja la decisión mejor que el silencio."
        },
        {
          "id": "CR03",
          "texto": "Quien disiente sigue adentro",
          "descripcion": "Después de opinar distinto, la persona sigue siendo parte del equipo."
        }
      ]
    },
    {
      "titulo": "Respeto en el roce",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "CR04",
          "texto": "Enojo hablado de frente",
          "descripcion": "Lo que molesta se dice a la persona, no a sus espaldas."
        },
        {
          "id": "CR05",
          "texto": "Humor sin humillar",
          "descripcion": "El humor no se usa para dejar a alguien en ridículo."
        },
        {
          "id": "CR06",
          "texto": "Tensiones que no se guardan",
          "descripcion": "Un roce se nombra en el momento, no se arrastra por semanas."
        }
      ]
    },
    {
      "titulo": "Reparación",
      "ponderacion": 25,
      "indicadores": [
        {
          "id": "CR07",
          "texto": "Volver a trabajar juntos",
          "descripcion": "Después de un conflicto, el equipo retoma el trabajo en común."
        },
        {
          "id": "CR08",
          "texto": "Disculpa cuando alguien se pasó",
          "descripcion": "Si alguien se excedió, lo reconoce."
        },
        {
          "id": "CR09",
          "texto": "Reparaciones que se cumplen",
          "descripcion": "Lo que se acordó arreglar después se hace."
        }
      ]
    }
  ]
}
```

---

## Justicia y trato

**Propósito:** ver si el reparto, el trato y la información se viven como parejos dentro del equipo.

**Por qué estos pesos:** reparto y trato van juntos (35): son las dos caras que la gente nombra primero. La información (30) explica la sensación de círculo interno.

**No concluir:** que hubo una injusticia comprobable ni quién la cometió. Es percepción agregada.

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Reparto y reconocimiento | 35 | Equidad de carga, crédito y oportunidades | ¿Qué aporte no se nombra? |
| Trato digno | 35 | Respeto interpersonal, también bajo presión | ¿En qué momento el trato se cae? |
| Información pareja | 30 | Las decisiones se explican a todo el equipo | ¿Quién se entera tarde? |

```json
{
  "titulo": "Justicia y trato",
  "descripcion": "Cómo se viven el reparto, el respeto y la información dentro del equipo. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Reparto y reconocimiento",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "JT01",
          "texto": "Crédito a quien hizo el trabajo",
          "descripcion": "El reconocimiento llega a la persona que lo hizo."
        },
        {
          "id": "JT02",
          "texto": "Criterio de reparto entendible",
          "descripcion": "El equipo puede explicar por qué la carga está repartida así."
        },
        {
          "id": "JT03",
          "texto": "Oportunidades que rotan",
          "descripcion": "El trabajo interesante no queda siempre en las mismas personas."
        }
      ]
    },
    {
      "titulo": "Trato digno",
      "ponderacion": 35,
      "indicadores": [
        {
          "id": "JT04",
          "texto": "Respeto también bajo presión",
          "descripcion": "Con apuro, el trato sigue siendo respetuoso."
        },
        {
          "id": "JT05",
          "texto": "Nadie expuesto al ridículo",
          "descripcion": "Nadie queda en ridículo delante del equipo."
        },
        {
          "id": "JT06",
          "texto": "Lugar para estilos distintos",
          "descripcion": "Se puede trabajar de otra manera sin que eso reste pertenencia."
        }
      ]
    },
    {
      "titulo": "Información pareja",
      "ponderacion": 30,
      "indicadores": [
        {
          "id": "JT07",
          "texto": "Decisiones explicadas",
          "descripcion": "Las decisiones que afectan al equipo se explican."
        },
        {
          "id": "JT08",
          "texto": "Respuesta franca a quien pregunta",
          "descripcion": "Quien pregunta recibe una respuesta directa."
        },
        {
          "id": "JT09",
          "texto": "Misma información al mismo tiempo",
          "descripcion": "El equipo se entera junto, no hay un grupo que se entera antes."
        }
      ]
    }
  ]
}
```

---

## Pulso psicológico

**Propósito:** un chequeo corto, repetible, de energía y de trato. No reemplaza a las plantillas largas: no separa constructos finos.

**Por qué 50/50:** las dos preguntas del pulso importan lo mismo y se comparan entre rondas, no contra un modelo teórico detallado.

**No concluir:** la causa. Si una mitad cae respecto de la ronda anterior, abrir la plantilla larga de ese lado (carga, o clima / conflicto / justicia).

| Sección | Peso | Constructo | Si está baja, preguntar |
|---|---:|---|---|
| Energía del equipo | 50 | Ritmo, claridad inmediata y resto | ¿Esto es de esta semana o viene de antes? |
| Trato entre personas | 50 | Voz, respeto, palabra y lugar | ¿El trato cambió o siempre fue así? |

```json
{
  "titulo": "Pulso psicológico",
  "descripcion": "Chequeo breve de energía y trato en el equipo. 1 es bajo y 5 es alto.",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "Energía del equipo",
      "ponderacion": 50,
      "indicadores": [
        {
          "id": "PP01",
          "texto": "Ritmo sostenible esta etapa",
          "descripcion": "El volumen de trabajo de ahora se puede sostener."
        },
        {
          "id": "PP02",
          "texto": "Claridad de la semana",
          "descripcion": "Está claro qué hay que lograr en esta semana."
        },
        {
          "id": "PP03",
          "texto": "Resto a fin de semana",
          "descripcion": "El equipo termina la semana con algo de energía, no vacío."
        },
        {
          "id": "PP04",
          "texto": "Apoyo si alguien está al límite",
          "descripcion": "Si alguien no da más, el equipo lo nota y reparte."
        }
      ]
    },
    {
      "titulo": "Trato entre personas",
      "ponderacion": 50,
      "indicadores": [
        {
          "id": "PP05",
          "texto": "Libertad para decir un problema",
          "descripcion": "Se puede nombrar un problema sin quedar expuesto."
        },
        {
          "id": "PP06",
          "texto": "Respeto cotidiano",
          "descripcion": "El trato de todos los días es respetuoso."
        },
        {
          "id": "PP07",
          "texto": "Palabra que se cumple",
          "descripcion": "Los acuerdos entre personas se cumplen."
        },
        {
          "id": "PP08",
          "texto": "Lugar para cada persona",
          "descripcion": "Cada quien tiene un lugar real en el equipo."
        }
      ]
    }
  ]
}
```
