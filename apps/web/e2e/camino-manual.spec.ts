import { expect, test, type Browser } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Camino a mano, sin clave y sin modelo.
 * No declara que la herramienta sea fácil: solo que el extremo a extremo sigue existiendo.
 */

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiRoot = path.resolve(webRoot, '../api');

function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address();
      const puerto = typeof direccion === 'object' && direccion ? direccion.port : 0;
      servidor.close(() => resolve(puerto));
    });
  });
}

function detener(proceso: ChildProcess) {
  if (proceso.pid == null || proceso.exitCode != null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(proceso.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  proceso.kill('SIGTERM');
}

async function esperarSalud(origen: string, salida: () => string) {
  const limite = Date.now() + 20_000;
  let ultimo = '';
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(`${origen}/api/health`);
      if (respuesta.ok) return;
      ultimo = `HTTP ${respuesta.status}`;
    } catch (error) {
      ultimo = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`La API no respondió en ${origen}. ${ultimo}\n${salida()}`);
}

async function responder(browser: Browser, url: string) {
  const contexto = await browser.newContext({ serviceWorkers: 'block' });
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(url, { waitUntil: 'domcontentloaded' });
    await pagina.getByRole('button', { name: 'Empezar', exact: true }).click();
    await pagina.getByRole('radio', { name: '5' }).click();
    await pagina.getByRole('button', { name: 'Revisar y enviar' }).click();
    await pagina.getByRole('button', { name: 'Enviar respuestas' }).click();
    await expect(pagina.getByRole('heading', { name: 'Tu respuesta quedó registrada' })).toBeVisible();
  } finally {
    await contexto.close();
  }
}

test('camino a mano: equipo, cuestionario que suma 100, ronda, tres respuestas e índice', async ({ page, browser }) => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-camino-manual-'));
  const puerto = await puertoLibre();
  const origen = `http://127.0.0.1:${puerto}`;
  let salida = '';
  const entorno = { ...process.env };
  for (const clave of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'AI_API_KEY']) {
    delete entorno[clave];
  }
  const servidor: ChildProcess = spawn(process.execPath, ['dist/app.js'], {
    cwd: apiRoot,
    env: {
      ...entorno,
      NODE_ENV: 'test',
      PORT: String(puerto),
      STORAGE_DRIVER: 'json',
      TERMOMETRO_DATA_DIR: dataDirectory,
      JWT_SECRET: 'browser-journey-jwt-secret-with-32-chars-min',
      AI_CREDENTIAL_SECRET: 'browser-journey-ai-secret-with-32-chars-min',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servidor.stdout?.on('data', (chunk) => { salida += chunk.toString(); });
  servidor.stderr?.on('data', (chunk) => { salida += chunk.toString(); });

  try {
    if (!fs.existsSync(path.join(webRoot, 'dist', 'index.html')) || !fs.existsSync(path.join(apiRoot, 'dist', 'app.js'))) {
      throw new Error('Falta el build de la web o de la API. Corré npm run test:browser desde la raíz.');
    }
    await esperarSalud(origen, () => salida);

    await page.goto(origen, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Crear mi cuenta y empezar' }).click();
    await page.getByLabel('Nombre').fill('Facilitadora');
    await page.getByLabel('Correo electrónico').fill('facilitadora@example.com');
    await page.getByLabel('Contraseña').fill('clave-segura');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('heading', { name: 'Creá el equipo que vas a escuchar' })).toBeVisible();
    await page.getByLabel('Nombre del equipo').fill('Producto');
    await page.getByRole('button', { name: 'Crear equipo' }).click();
    await expect(page.getByRole('button', { name: 'Armar el cuestionario a mano' })).toBeVisible();

    // En el primer uso el encabezado muestra los pasos y no ofrece Evaluaciones como par.
    await page.goto(`${origen}/backoffice/consulta-evaluacion`);
    await page.getByRole('button', { name: 'Armar el cuestionario' }).click();
    await expect(page.getByText('Podés escribir las preguntas acá.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'conectá la inteligencia' })).toBeVisible();
    await expect(page.getByText('Las secciones ya suman 100.')).toBeVisible();

    await page.getByLabel('Nombre del cuestionario').fill('Pulso de claridad');
    await page.getByLabel('Nombre de la sección').fill('Trabajo');
    await page.getByLabel('Peso de la sección').fill('100');
    await page.getByLabel('Pregunta', { exact: true }).fill('Tenemos claridad sobre el trabajo');
    await expect(page.getByRole('button', { name: 'Mejor' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Tienen que sumar 100/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Guardar el cuestionario' }).click();

    await expect(page.getByRole('heading', { name: 'El cuestionario quedó guardado' })).toBeVisible();
    const salud = page.waitForResponse((respuesta) => respuesta.url().includes('/api/health') && respuesta.ok());
    await page.getByRole('link', { name: 'Abrir la ronda' }).click();
    await salud;

    await page.getByLabel('Cuántas personas deberían responder').fill('3');
    await page.getByText('Ajustar esta ronda').click();
    await expect(page.getByLabel('Mínimo para mostrar el resultado')).toHaveValue('3');
    await page.getByRole('button', { name: 'Abrir la ronda' }).click();
    await page.getByRole('button', { name: 'Solo en esta computadora' }).click();

    await expect(page.getByRole('heading', { name: 'Listo para compartir' })).toBeVisible();
    const link = await page.locator('#link-equipo').inputValue();
    const publica = new URL(link);
    expect(publica.pathname).toMatch(/^\/r\/[A-Za-z0-9_-]{32,}$/);
    const rondaId = new URL(page.url()).searchParams.get('instanciaId') || '';
    expect(rondaId.length).toBeGreaterThan(0);
    expect(publica.pathname).not.toContain(rondaId);

    for (let vez = 0; vez < 3; vez += 1) await responder(browser, link);

    await page.getByRole('link', { name: 'acá' }).click();
    const resumen = page.getByRole('region', { name: 'Resumen del índice de clima' });
    await expect(resumen).toBeVisible();
    await expect(resumen.getByText('100', { exact: true })).toBeVisible();
    await expect(page.getByText('Respondieron 3 de 3')).toBeVisible();
    await expect(page.getByText('Resultados protegidos por anonimato')).toHaveCount(0);
  } finally {
    detener(servidor);
    await Promise.race([
      new Promise((resolve) => servidor.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});
