import 'dotenv/config';
import path from 'node:path';
import mongoose from 'mongoose';
import { conectarDB } from '../config/db';
import { dataDirectory } from '../storage/local-store';
import { eliminarUsuarioLocal, eliminarUsuarioMongo, validarCorreo, type DeleteSummary } from '../services/eliminar-usuario.service';

type Options = { email?: string; mode: 'mongo' | 'local'; localDir: string; confirm?: string; dryRun: boolean };

const usage = () => `
Uso:
  npm run delete-user -w @termometro/api -- --email usuario@ejemplo.com [opciones]

Opciones:
  --mode mongo|local       Persistencia a limpiar (por defecto: mongo)
  --local-dir <ruta>       Carpeta de datos JSON cuando --mode local
                           (por defecto: TERMOMETRO_DATA_DIR o la carpeta de instalación)
  --confirm <correo>       Habilita el borrado real; debe coincidir exactamente
  --dry-run                Solo informa qué se borraría (opción por defecto)
`;

const parseArgs = (args: string[]): Options => {
  const options: Options = { mode: 'mongo', localDir: dataDirectory(), dryRun: true };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === '--email') options.email = next;
    else if (arg === '--mode' && (next === 'mongo' || next === 'local')) options.mode = next;
    else if (arg === '--local-dir' && next) options.localDir = path.resolve(next);
    else if (arg === '--local-file') {
      throw new Error('El formato de un solo archivo quedó obsoleto. Usá --local-dir con la carpeta de datos (archivos por colección).');
    }
    else if (arg === '--confirm') { options.confirm = next; options.dryRun = false; }
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') { console.log(usage()); process.exit(0); }
    else if (arg.startsWith('--')) throw new Error(`Opción desconocida: ${arg}`);
    if (['--email', '--mode', '--local-dir', '--confirm'].includes(arg)) index += 1;
  }
  if (!options.email) throw new Error('Falta --email.');
  return options;
};

const printSummary = (summary: DeleteSummary) => {
  console.log(`${summary.dryRun ? 'Vista previa' : 'Borrado completado'} para ${summary.email}`);
  for (const [collection, count] of Object.entries(summary.collections)) {
    if (count > 0) console.log(`  ${collection}: ${count}`);
  }
  if (Object.values(summary.collections).every((count) => count === 0)) console.log('  No se encontró un usuario con ese correo.');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const email = validarCorreo(options.email!);
  if (!options.dryRun && options.confirm !== email) {
    throw new Error('Para borrar, --confirm debe coincidir exactamente con --email. Ejecuta primero con --dry-run.');
  }
  let summary: DeleteSummary;
  if (options.mode === 'local') {
    summary = await eliminarUsuarioLocal(options.localDir, email, options.dryRun);
  } else {
    await conectarDB();
    summary = await eliminarUsuarioMongo(email, options.dryRun);
  }
  printSummary(summary);
  if (options.mode === 'mongo') await mongoose.disconnect();
};

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});
