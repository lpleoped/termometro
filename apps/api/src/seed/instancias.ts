import { Usuario } from '../models/Usuario';
import { Equipo } from '../models/Equipo';
import { Evaluacion } from '../models/Evaluacion';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Types } from 'mongoose';

export async function crearInstancias() {
  const usuario = await Usuario.findOne({ email: 'test@test.com' });
  if (!usuario) {
    console.error('Usuario test@test.com no encontrado');
    return;
  }

  const usuarioId = usuario._id as Types.ObjectId;
  const equipos = await Equipo.find({ creadoPor: usuarioId });
  const evaluaciones = await Evaluacion.find({ creadoPor: usuarioId, tipo: 'CUSTOM' });

  if (equipos.length === 0 || evaluaciones.length === 0) {
    console.warn('No hay equipos o evaluaciones para crear instancias');
    return;
  }

  let total = 0;

  for (const equipo of equipos) {
    for (const evaluacion of evaluaciones) {
      for (const offset of [14, 7]) {
        const activadoEn = new Date();
        activadoEn.setDate(activadoEn.getDate() - offset);

        const yaExiste = await InstanciaEvaluacion.findOne({
          equipo: equipo._id,
          evaluacion: evaluacion._id,
          activadoEn: {
            $gte: new Date(
              activadoEn.getFullYear(),
              activadoEn.getMonth(),
              activadoEn.getDate(),
            ),
          },
        });

        if (yaExiste) {
          console.log(
            `Instancia ya existe: ${equipo.nombre} - ${evaluacion.titulo} (${activadoEn.toDateString()})`,
          );
          continue;
        }

        await InstanciaEvaluacion.create({
          equipo: equipo._id,
          evaluacion: evaluacion._id,
          activadoEn,
          estado: 'activa',
          cantidadEsperada: 3,
          descripcionLider: `Instancia de ${evaluacion.titulo} para ${equipo.nombre}`,
        });

        console.log(
          `Instancia creada: ${evaluacion.titulo} → ${equipo.nombre} (${activadoEn.toDateString()})`,
        );
        total++;
      }
    }
  }

  console.log(`Total de instancias creadas: ${total}`);
}
