import { Usuario } from '../models/Usuario';
import bcrypt from 'bcryptjs';

export async function crearClientes() {
  const clientes = [
    { nombre: 'Test Test', email: 'test@test.com', password: '123123', rol: 'lider' as const },
    { nombre: 'Luis González', email: 'luis@empresa.com', password: '123123', rol: 'lider' as const },
    { nombre: 'Verónica Duarte', email: 'vero@empresa.com', password: '123123', rol: 'lider' as const },
  ];

  for (const cliente of clientes) {
    const existente = await Usuario.findOne({ email: cliente.email });
    if (existente) {
      console.log(`Cliente ya existe: ${cliente.email}`);
      continue;
    }

    const hashed = await bcrypt.hash(cliente.password, 10);
    await Usuario.create({
      nombre: cliente.nombre,
      email: cliente.email,
      password: hashed,
      rol: cliente.rol,
    });

    console.log(`Cliente creado: ${cliente.email}`);
  }
}
