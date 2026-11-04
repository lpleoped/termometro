import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

import { conectarDB } from './config/db';
import { crearClientes } from './seed/clientes';
import { crearEquipos } from './seed/equipos';
import { crearEvaluaciones } from './seed/evaluaciones';
import { crearInstancias } from './seed/instancias';
import { crearRespuestas } from './seed/respuestas';

async function runSeed() {
  try {
    await conectarDB();
    console.log('Conectado a MongoDB — seed clima');

    await crearClientes();
    await crearEquipos();
    await crearEvaluaciones();
    await crearInstancias();
    await crearRespuestas();

    await mongoose.disconnect();
    console.log('Seed clima listo. Login demo: test@test.com / 123123');
  } catch (err) {
    console.error('Error en seed:', err);
    process.exit(1);
  }
}

runSeed();
