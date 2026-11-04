import { Equipo } from '../models/Equipo';
import { Usuario } from '../models/Usuario';

export async function crearEquipos() {
  const definiciones = [
    {
      email: 'test@test.com',
      nombre: 'Equipo QA Automation',
      descripcion: 'Responsable de calidad y automatización',
      miembros: ['qa1@empresa.com', 'qa2@empresa.com'],
    },
    {
      email: 'test@test.com',
      nombre: 'Equipo Frontend',
      descripcion: 'Encargado de la experiencia de usuario',
      miembros: ['ui1@empresa.com', 'ui2@empresa.com'],
    },
    {
      email: 'test@test.com',
      nombre: 'Equipo Backend',
      descripcion: 'Diseño de servicios y lógica de negocio',
      miembros: ['be1@empresa.com', 'be2@empresa.com'],
    },
  ];

  for (const def of definiciones) {
    const usuario = await Usuario.findOne({ email: def.email });
    if (!usuario) {
      console.warn(`Usuario no encontrado: ${def.email}`);
      continue;
    }

    const existente = await Equipo.findOne({ nombre: def.nombre });
    if (existente) {
      console.log(`Equipo ya existe: ${def.nombre}`);
      continue;
    }

    await Equipo.create({
      nombre: def.nombre,
      descripcion: def.descripcion,
      miembros: def.miembros,
      creadoPor: usuario._id,
      creadoEn: new Date(),
    });

    console.log(`Equipo creado: ${def.nombre}`);
  }
}
