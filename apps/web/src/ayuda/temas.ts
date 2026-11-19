export const TEMAS = [
  { tema: 'que-es', titulo: 'Qué es', frase: 'Para qué sirve y qué dos lecturas conviven.' },
  { tema: 'equipos', titulo: 'Equipos', frase: 'El grupo que vas a escuchar y sus rondas.' },
  { tema: 'cuestionarios', titulo: 'Cuestionarios', frase: 'Secciones, pesos y la escala de 1 a 5.' },
  { tema: 'resultados', titulo: 'Resultados', frase: 'El índice 0–100, el semáforo, la participación y el histórico.' },
  { tema: 'lo-escrito', titulo: 'Lo escrito', frase: 'Temas y señales del conjunto, aparte del número.' },
  { tema: 'accionables', titulo: 'Accionables', frase: 'El paso que decidís seguir después de una ronda.' },
  { tema: 'uso', titulo: 'Uso', frase: 'Las consultas de esta cuenta, sin el texto enviado.' },
  { tema: 'configuracion', titulo: 'Configuración', frase: 'Lo de la cuenta y lo de un equipo.' },
  { tema: 'responder', titulo: 'Responder', frase: 'Qué ve quien recibe el enlace.' },
] as const

export type TemaAyuda = (typeof TEMAS)[number]['tema']
