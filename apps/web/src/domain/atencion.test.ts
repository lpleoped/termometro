import { elegirHoy, indiceAnteriorComparable, mapaHoy, type EquipoHoy, type RondaHoy } from './atencion.ts';

function igual(condicion: boolean, mensaje: string) {
  if (!condicion) throw new Error(mensaje);
}

const AHORA = Date.parse('2026-11-16T15:00:00.000Z');

function ronda(parcial: Partial<RondaHoy> & Pick<RondaHoy, 'instanciaId'>): RondaHoy {
  return {
    abierta: true,
    indice: 70,
    protegido: false,
    recibidas: 6,
    esperadas: 8,
    sinLectura: false,
    ...parcial,
  };
}

function equipo(parcial: Partial<EquipoHoy> & Pick<EquipoHoy, 'equipoId' | 'nombre'>): EquipoHoy {
  return {
    ultimaRonda: ronda({ instanciaId: `ronda-${parcial.equipoId}` }),
    anterior: null,
    seguimientos: [],
    propuestasSinDecidir: false,
    ...parcial,
  };
}

function visible(resultado: NonNullable<ReturnType<typeof elegirHoy>>): string {
  return [resultado.frase, resultado.gesto, ...resultado.lineas.map((linea) => linea.frase)].join(' | ');
}

const operaciones = equipo({
  equipoId: 'operaciones',
  nombre: 'Operaciones',
  ultimaRonda: ronda({ instanciaId: 'ronda-operaciones', indice: 32, sinLectura: true }),
});
const producto = equipo({
  equipoId: 'producto',
  nombre: 'Producto',
  ultimaRonda: ronda({ instanciaId: 'ronda-producto', indice: 12, protegido: true, recibidas: 1, esperadas: 8, sinLectura: true }),
});

const criticoYSilencio = elegirHoy([producto, operaciones], null, AHORA);
igual(criticoYSilencio?.equipoId === 'operaciones', 'el crítico legible gana sobre el silencio');
igual(criticoYSilencio?.frase === 'Hoy, Operaciones. El clima está crítico.', 'la frase nombra al crítico y dice por qué');
igual(criticoYSilencio?.gesto === 'Ver cómo está Operaciones', 'el botón es ver cómo está ese equipo');
igual(criticoYSilencio?.destino === '/backoffice/dashboard?instanciaId=ronda-operaciones', 'el botón abre el estado actual de esa ronda');
igual(criticoYSilencio?.lineas.length === 1, 'el silencio queda en una línea');
igual(criticoYSilencio?.lineas[0].frase === 'Producto está en silencio: respondió 1 de 8.', 'la línea de silencio dice cuántos respondieron');
igual(!visible(criticoYSilencio!).includes('12'), 'el silencio no muestra el índice protegido');
igual(!/brasa|deuda|instancia|promedio/i.test(visible(criticoYSilencio!)), 'no se imprimen los nombres internos ni un promedio');
console.log('✓ crítico legible contra silencio');

const conDeuda = equipo({
  equipoId: 'finanzas',
  nombre: 'Finanzas',
  ultimaRonda: ronda({ instanciaId: 'ronda-finanzas', indice: 85 }),
  seguimientos: [{ venceEn: '2026-11-01T00:00:00.000Z', estado: 'pendiente' }],
});
const deudaPrimero = elegirHoy([operaciones, conDeuda], 'operaciones', AHORA);
igual(deudaPrimero?.equipoId === 'finanzas', 'el seguimiento vencido pasa adelante aunque el clima sea bueno');
igual(deudaPrimero?.frase === 'Hoy, Finanzas. El seguimiento venció.', 'la frase dice que el seguimiento venció');
igual(deudaPrimero?.gesto === 'Registrar qué pasó', 'el gesto es registrar qué pasó');
igual(deudaPrimero?.destino === '/backoffice/accionables?equipoId=finanzas', 'el seguimiento abre Accionables del equipo');
igual(deudaPrimero?.lineas[0]?.equipoId === 'operaciones', 'el crítico queda en la línea siguiente');
console.log('✓ deuda de seguimiento contra clima bueno');

const propuestas = equipo({
  equipoId: 'personas',
  nombre: 'Personas',
  ultimaRonda: ronda({ instanciaId: 'ronda-personas', indice: 90 }),
  propuestasSinDecidir: true,
});
const propuestasPrimero = elegirHoy([operaciones, propuestas], null, AHORA);
igual(propuestasPrimero?.equipoId === 'personas', 'las propuestas sin decidir ganan al crítico');
igual(propuestasPrimero?.gesto === 'Decidir las propuestas', 'el gesto es decidir las propuestas');
igual(propuestasPrimero?.destino === '/backoffice/accionables?equipoId=personas', 'las propuestas abren Accionables del equipo');
console.log('✓ deuda de propuestas');

const criticoCerrado = equipo({
  equipoId: 'critico-cerrado',
  nombre: 'Cerrado',
  ultimaRonda: ronda({ instanciaId: 'ronda-cerrada', indice: 39, abierta: false }),
});
igual(elegirHoy([producto, criticoCerrado], null, AHORA)?.equipoId === 'critico-cerrado', 'el crítico se lee también con la ronda cerrada');
igual(elegirHoy([equipo({ equipoId: 'regular', nombre: 'Regular', ultimaRonda: ronda({ instanciaId: 'ronda-regular', indice: 40, sinLectura: true }) })], null, AHORA)?.frase.includes('crítico') !== true, '40 no es crítico');
console.log('✓ brasa crítica');

const enfriado = equipo({
  equipoId: 'enfriado',
  nombre: 'Enfriado',
  ultimaRonda: ronda({ instanciaId: 'ronda-enfriado', indice: 50, sinLectura: true }),
  anterior: { indice: 53, comparable: true },
});
const enfriamiento = elegirHoy([producto, enfriado], null, AHORA);
igual(enfriamiento?.equipoId === 'enfriado', 'bajar 3 puntos gana al silencio');
igual(enfriamiento?.gesto === 'Ver qué cambió en Enfriado', 'el gesto del enfriamiento es ver qué cambió');
igual(enfriamiento?.destino === '/backoffice/dashboard?instanciaId=ronda-enfriado', 'el enfriamiento abre el estado actual');
const casi = equipo({
  equipoId: 'casi',
  nombre: 'Casi',
  ultimaRonda: ronda({ instanciaId: 'ronda-casi', indice: 50, sinLectura: true }),
  anterior: { indice: 52, comparable: true },
});
igual(!elegirHoy([casi], null, AHORA)!.frase.includes('bajó'), 'bajar 2 puntos no es enfriamiento');
const noComparable = equipo({
  equipoId: 'otro-cuestionario',
  nombre: 'Otro',
  ultimaRonda: ronda({ instanciaId: 'ronda-otro', indice: 50, sinLectura: false }),
  anterior: { indice: 80, comparable: false },
});
igual(!elegirHoy([noComparable], null, AHORA)!.frase.includes('bajó'), 'sin ronda comparable no hay enfriamiento');
const criticoYFrio = equipo({
  equipoId: 'ambos',
  nombre: 'Ambos',
  ultimaRonda: ronda({ instanciaId: 'ronda-ambos', indice: 30 }),
  anterior: { indice: 50, comparable: true },
});
igual(elegirHoy([criticoYFrio], null, AHORA)?.gesto === 'Ver cómo está Ambos', 'si está crítico, ese peldaño gana al enfriamiento');
console.log('✓ enfriamiento de 3 puntos');

const conRespuestas = equipo({
  equipoId: 'qa',
  nombre: 'QA',
  ultimaRonda: ronda({ instanciaId: 'ronda-qa', indice: 72, sinLectura: true }),
});
const respuestas = elegirHoy([producto, conRespuestas], null, AHORA);
igual(respuestas?.equipoId === 'qa', 'la ronda con respuestas y sin lectura gana al silencio');
igual(respuestas?.frase === 'Hoy, QA. Hay respuestas nuevas.', 'la frase dice que hay respuestas nuevas');
igual(respuestas?.destino === '/backoffice/dashboard?instanciaId=ronda-qa', 'las respuestas nuevas abren el estado actual');
const yaLeida = equipo({
  equipoId: 'leida',
  nombre: 'Leída',
  ultimaRonda: ronda({ instanciaId: 'ronda-leida', indice: 72, sinLectura: false }),
});
igual(elegirHoy([yaLeida], 'leida', AHORA)?.gesto === 'Abrir otra ronda de Leída', 'una lectura ya hecha y un clima bueno no piden otra lectura');
console.log('✓ ronda con respuestas');

const soloSilencio = elegirHoy([producto], null, AHORA);
igual(soloSilencio?.gesto === 'Compartir de nuevo con Producto', 'el silencio pide compartir de nuevo');
igual(soloSilencio?.destino === '/backoffice/publicar-evaluacion?instanciaId=ronda-producto', 'compartir de nuevo abre esa ronda');
igual(!soloSilencio?.frase.includes('12'), 'la frase de silencio no muestra índice');
const protegidaCerrada = equipo({
  equipoId: 'oculta',
  nombre: 'Oculta',
  ultimaRonda: ronda({ instanciaId: 'ronda-oculta', indice: 5, protegido: true, recibidas: 1, abierta: false }),
});
const sana = equipo({
  equipoId: 'sana',
  nombre: 'Sana',
  ultimaRonda: ronda({ instanciaId: 'ronda-sana', indice: 80, sinLectura: false }),
});
const sinClima = elegirHoy([protegidaCerrada, sana], null, AHORA);
igual(!visible(sinClima!).includes('crítico'), 'una ronda protegida no gana por clima');
igual(Boolean(sinClima?.gesto.startsWith('Abrir otra ronda')), 'sin señales, la primaria es abrir otra ronda');
igual(sinClima?.lineas.length === 0, 'sin señales no se dibujan líneas vacías');
console.log('✓ silencio y ronda protegida');

const vacia = elegirHoy([], null, AHORA);
igual(vacia === null, 'la cartera vacía no inventa un equipo');
console.log('✓ cartera vacía');

const brasaBaja = equipo({ equipoId: 'b', nombre: 'Baja', ultimaRonda: ronda({ instanciaId: 'ronda-b', indice: 22 }) });
const brasaAlta = equipo({ equipoId: 'a', nombre: 'Alta', ultimaRonda: ronda({ instanciaId: 'ronda-a', indice: 30 }) });
const ordenCarga = [brasaAlta, brasaBaja];
igual(elegirHoy(ordenCarga, 'a', AHORA)?.equipoId === 'b', 'en brasa gana el índice más bajo, no el equipo guardado');
igual(elegirHoy([...ordenCarga].reverse(), 'a', AHORA)?.equipoId === 'b', 'el orden de carga no cambia la brasa');
igual(ordenCarga[0].equipoId === 'a', 'la cartera de entrada no se reordena');
const mismaBrasaA = equipo({ equipoId: 'm-2', nombre: 'Dos', ultimaRonda: ronda({ instanciaId: 'ronda-2', indice: 30 }) });
const mismaBrasaB = equipo({ equipoId: 'm-1', nombre: 'Uno', ultimaRonda: ronda({ instanciaId: 'ronda-1', indice: 30 }) });
igual(elegirHoy([mismaBrasaA, mismaBrasaB], 'm-2', AHORA)?.equipoId === 'm-2', 'empate de brasa: gana el equipo que la persona venía mirando');
igual(elegirHoy([mismaBrasaA, mismaBrasaB], 'otro', AHORA)?.equipoId === 'm-1', 'si el id guardado no está empatado, gana el id menor');
igual(elegirHoy([mismaBrasaB, mismaBrasaA], null, AHORA)?.equipoId === 'm-1', 'sin id guardado gana el id menor');

const deudaVieja = equipo({
  equipoId: 'nueva',
  nombre: 'Nueva',
  ultimaRonda: ronda({ instanciaId: 'ronda-nueva', indice: 10 }),
  seguimientos: [{ venceEn: '2026-11-10T00:00:00.000Z', estado: 'pendiente' }],
});
const deudaNueva = equipo({
  equipoId: 'vieja',
  nombre: 'Vieja',
  ultimaRonda: ronda({ instanciaId: 'ronda-vieja', indice: 90 }),
  seguimientos: [{ venceEn: '2026-10-01T00:00:00.000Z', estado: 'pendiente' }],
});
igual(elegirHoy([deudaVieja, deudaNueva], 'nueva', AHORA)?.equipoId === 'vieja', 'en la deuda gana la fecha cumplida más vieja');
const mismaFechaA = equipo({
  equipoId: 'z',
  nombre: 'Zeta',
  seguimientos: [{ venceEn: '2026-10-01T00:00:00.000Z', estado: 'pendiente' }, { venceEn: '2026-11-01T00:00:00.000Z', estado: 'completado' }],
});
const mismaFechaB = equipo({
  equipoId: 'y',
  nombre: 'Ye',
  seguimientos: [{ venceEn: '2026-10-01T00:00:00.000Z', estado: 'pendiente' }],
});
igual(elegirHoy([mismaFechaA, mismaFechaB], 'z', AHORA)?.equipoId === 'z', 'misma fecha de seguimiento: gana el equipo guardado');
igual(elegirHoy([mismaFechaA, mismaFechaB], null, AHORA)?.equipoId === 'y', 'misma fecha y sin id guardado: gana el id menor');
const futuro = equipo({
  equipoId: 'futuro',
  nombre: 'Futuro',
  ultimaRonda: ronda({ instanciaId: 'ronda-futuro', indice: 10 }),
  seguimientos: [{ venceEn: '2026-12-01T00:00:00.000Z', estado: 'pendiente' }],
});
igual(elegirHoy([futuro], null, AHORA)?.frase.includes('crítico') === true, 'un seguimiento que todavía no vence no es deuda');
console.log('✓ empates');

const frioLeve = equipo({
  equipoId: 'leve',
  nombre: 'Leve',
  ultimaRonda: ronda({ instanciaId: 'ronda-leve', indice: 60 }),
  anterior: { indice: 63, comparable: true },
});
const frioFuerte = equipo({
  equipoId: 'fuerte',
  nombre: 'Fuerte',
  ultimaRonda: ronda({ instanciaId: 'ronda-fuerte', indice: 70 }),
  anterior: { indice: 90, comparable: true },
});
igual(elegirHoy([frioFuerte, frioLeve], 'fuerte', AHORA)?.equipoId === 'leve', 'en el enfriamiento también gana el índice legible más bajo');

const propuestasA = equipo({ equipoId: 'p-2', nombre: 'P2', propuestasSinDecidir: true, ultimaRonda: ronda({ instanciaId: 'rp2', indice: 10 }) });
const propuestasB = equipo({ equipoId: 'p-1', nombre: 'P1', propuestasSinDecidir: true, ultimaRonda: ronda({ instanciaId: 'rp1', indice: 90 }) });
igual(elegirHoy([propuestasA, propuestasB], null, AHORA)?.equipoId === 'p-1', 'el índice no desempata la deuda de propuestas');
console.log('✓ desempate solo en su peldaño');

const silences = ['s-4', 's-1', 's-3', 's-2'].map((id) => equipo({
  equipoId: id,
  nombre: id,
  ultimaRonda: ronda({ instanciaId: `ronda-${id}`, protegido: true, recibidas: 0, esperadas: 5, indice: 1 }),
}));
const muchas = elegirHoy(silences, null, AHORA);
igual(muchas?.equipoId === 's-1', 'varios silencios: gana el id menor');
igual(muchas?.lineas.length === 3, 'hay como máximo tres líneas');
igual(muchas?.lineas.map((linea) => linea.equipoId).join(',') === 's-2,s-3,s-4', 'las líneas siguen la misma escalera y no repiten al ganador');
const sanoDeMas = equipo({ equipoId: 's-0', nombre: 'Sano', ultimaRonda: ronda({ instanciaId: 'ronda-sano', indice: 80, sinLectura: false }) });
const conSano = elegirHoy([sanoDeMas, ...silences], null, AHORA);
igual(Boolean(conSano?.lineas.every((linea) => linea.equipoId !== 's-0')), 'un equipo sin señal no ocupa una línea');
console.log('✓ tres líneas');

igual(indiceAnteriorComparable([
  { instanciaId: 'actual', activadoEn: '2026-11-01T00:00:00.000Z', indice: 50 },
  { instanciaId: 'previa', activadoEn: '2026-08-01T00:00:00.000Z', indice: 70 },
  { instanciaId: 'vieja', activadoEn: '2026-01-01T00:00:00.000Z', indice: 90 },
], 'actual', true) === 70, 'la anterior comparable es la inmediata');
igual(indiceAnteriorComparable([
  { instanciaId: 'previa', activadoEn: '2026-08-01T00:00:00.000Z', indice: 70 },
], 'actual', true) === null, 'si esta ronda no está en el histórico, no se compara con otra');
igual(indiceAnteriorComparable([
  { instanciaId: 'actual', activadoEn: '2026-11-01T00:00:00.000Z', indice: 50 },
  { instanciaId: 'previa', activadoEn: '2026-08-01T00:00:00.000Z', indice: 70 },
], 'actual', false) === null, 'si no son comparables, no hay índice anterior');
console.log('✓ ronda anterior comparable');

const mapa = mapaHoy([producto, operaciones, sanoDeMas], null, AHORA);
igual(mapa.map((fila) => fila.equipoId).join(',') === 'operaciones,producto,s-0', 'el mapa sigue la escalera e incluye al que está bien');
igual(mapa[0].banda === 'atender' && mapa[0].indice === 32 && mapa[0].semaforo === 'Crítico', 'el crítico muestra índice y semáforo');
igual(mapa[0].motivo === 'El clima está crítico.', 'el motivo del crítico no repite el nombre');
igual(mapa[1].banda === 'curso' && mapa[1].indice === null && mapa[1].semaforo === null, 'la ronda protegida no lleva índice');
igual(mapa[1].motivo === 'Respondió 1 de 8.', 'el silencio dice cuántos respondieron');
igual(!mapa[1].motivo.includes('12'), 'el motivo del silencio no muestra el índice protegido');
igual(mapa[2].banda === 'calma' && mapa[2].indice === 80 && mapa[2].semaforo === 'Excelente', 'sin novedad muestra el índice');
igual(mapa[2].destino === '/backoffice/publicar-evaluacion?equipoId=s-0', 'sin novedad abre otra ronda de ese equipo');
igual(mapaHoy([], null, AHORA).length === 0, 'el mapa vacío no inventa filas');
const mapaSilencio = mapaHoy([sanoDeMas, ...silences], null, AHORA);
igual(mapaSilencio.length === 5, 'el mapa lista a todos, también al que está bien');
igual(mapaSilencio.filter((fila) => fila.banda === 'calma').map((fila) => fila.equipoId).join(',') === 's-0', 'el equipo sin señal queda en sin novedad');
igual(mapaSilencio.filter((fila) => fila.indice == null).length === 4, 'los silencios no llevan índice');
igual(mapaHoy([mismaBrasaA, mismaBrasaB], 'm-2', AHORA)[0].equipoId === 'm-2', 'el mapa desempata igual que la primaria');
const oculta = mapaHoy([protegidaCerrada, sana], null, AHORA).find((fila) => fila.equipoId === 'oculta');
igual(oculta?.banda === 'calma' && oculta.indice === null && oculta.semaforo === null, 'una ronda protegida y cerrada no muestra el índice');
igual(oculta?.motivo === 'Podés abrir otra ronda. Respondió 1 de 8.', 'la ronda protegida dice cuántos respondieron');
igual(!oculta?.motivo.includes('5'), 'el motivo protegido no muestra el índice oculto');
console.log('✓ mapa de equipos');
