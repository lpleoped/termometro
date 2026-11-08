import { app, BrowserWindow, dialog, Menu, safeStorage, ipcMain } from 'electron';
import { installationSecrets } from './installation-secrets';
import { checkForUpdates } from './updates';
import { prepareVersion } from './version-recovery';
import { spawn, type ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';

const PORT = 3210;
let apiProcess: ChildProcess | undefined;
let mainWindow: BrowserWindow | undefined;
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on('second-instance', () => { mainWindow?.restore(); mainWindow?.focus(); });

interface NetworkStatus {
  profileType: 'Private' | 'Public' | 'Domain' | 'Unknown';
  lanHealthy: boolean;
  lanAddress: string | null;
}

async function getNetworkProfile(): Promise<string> {
  if (process.platform !== 'win32') return 'Unknown';
  
  return new Promise((resolve) => {
    exec(
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq \'Internet\' -or $_.IPv4Connectivity -eq \'LocalNetwork\' } | Select-Object -First 1 -ExpandProperty NetworkCategory"',
      { timeout: 5000, windowsHide: true },
      (error, stdout) => {
        if (error) {
          resolve('Unknown');
          return;
        }
        const category = stdout.trim();
        // NetworkCategory values: 0=Public, 1=Private, 2=Domain
        if (category === 'Public' || category === '0') resolve('Public');
        else if (category === 'Private' || category === '1') resolve('Private');
        else if (category === 'Domain' || category === '2') resolve('Domain');
        else resolve('Unknown');
      }
    );
  });
}

function getLanAddress(): string | null {
  const interfaces = os.networkInterfaces();
  for (const [name, items] of Object.entries(interfaces)) {
    // Skip virtual interfaces
    if (/^(vEthernet|docker|wsl|vmnet|vboxnet|utun|tun|tap)/i.test(name)) continue;
    
    for (const item of items || []) {
      if (item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.')) {
        return item.address;
      }
    }
  }
  return null;
}

async function checkLanHealth(): Promise<boolean> {
  const lanAddress = getLanAddress();
  if (!lanAddress) return false;
  
  return new Promise((resolve) => {
    const request = http.get(`http://${lanAddress}:${PORT}/api/health`, { timeout: 3000 }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function getNetworkStatus(): Promise<NetworkStatus> {
  const [profileType, lanHealthy] = await Promise.all([
    getNetworkProfile(),
    checkLanHealth()
  ]);
  
  return {
    profileType: profileType as NetworkStatus['profileType'],
    lanHealthy,
    lanAddress: getLanAddress(),
  };
}

function apiRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'api')
    : path.resolve(__dirname, '../../api');
}
function dataDir() { return path.join(app.getPath('userData'), 'data'); }

function waitForHealth(timeoutMs = 30_000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${PORT}/api/health`, (response) => {
        response.resume();
        if (response.statusCode === 200 && apiProcess?.exitCode === null) return resolve();
        retry();
      });
      request.on('error', retry);
      request.setTimeout(1000, () => { request.destroy(new Error('Tiempo de espera agotado')); });
    };
    const retry = () => {
      if (apiProcess?.exitCode !== null) return reject(new Error('No se pudo iniciar el servicio local. Cerrá las otras ventanas de Termómetro e intentá nuevamente.'));
      if (Date.now() - started > timeoutMs) reject(new Error('La API local no respondió a tiempo.'));
      else setTimeout(check, 250);
    };
    check();
  });
}

async function startApi() {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows no pudo abrir el almacenamiento protegido de credenciales. Intentá iniciar sesión nuevamente.');
  const secrets = installationSecrets(app.getPath('userData'), value => safeStorage.encryptString(value), value => safeStorage.decryptString(value));
  const apiEntry = path.join(apiRoot(), 'dist', 'app.js');
  if (!fs.existsSync(apiEntry)) throw new Error('La API no está compilada. Ejecutá el build antes de abrir la app.');
  apiProcess = spawn(process.execPath, [apiEntry], {
    cwd: apiRoot(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      STORAGE_DRIVER: 'json',
      TERMOMETRO_DESKTOP: 'true',
      LOCAL_NETWORK: 'true',
      TERMOMETRO_DATA_DIR: dataDir(),
      NODE_ENV: 'production',
      ...(app.isPackaged ? { NODE_PATH: path.join(process.resourcesPath, 'node_modules') } : {}),
      JWT_SECRET: secrets.jwt,
      AI_CREDENTIAL_SECRET: secrets.ai,
      INTEGRATION_ENCRYPTION_KEY: secrets.integrations,
    },
    stdio: 'inherit',
  });
  apiProcess.on('exit', (code) => { if (code && app.isReady()) void dialog.showErrorBox('Termómetro de Equipo', `La API local se cerró con código ${code}.`); });
  await waitForHealth();
}

async function createWindow() {
  const commitVersion = prepareVersion(app.getPath('userData'), app.getVersion());
  await startApi();
  const page = await fetch(`http://127.0.0.1:${PORT}/`);
  if (!page.ok || !(await page.text()).includes('<div id="root"></div>')) {
    throw new Error('La interfaz de Termómetro no está disponible. Reinstalá la aplicación conservando tus datos.');
  }
  mainWindow = new BrowserWindow({ title: 'Termómetro de Equipo', width: 1280, height: 820, minWidth: 960, minHeight: 640, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  commitVersion();
}

if (hasInstanceLock) app.whenReady().then(() => createWindow().catch((error) => { dialog.showErrorBox('No se pudo iniciar Termómetro de Equipo', error instanceof Error ? error.message : String(error)); app.quit(); }));
async function showDiagnostics() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    const health = await response.json() as { storage?: string; dataDirectory?: string };
    await dialog.showMessageBox(mainWindow!, { type: 'info', title: 'Diagnóstico técnico', message: 'Termómetro de Equipo está funcionando', detail: `Estado: ${response.ok ? 'correcto' : 'con problemas'}\nAlmacenamiento: ${health.storage || 'desconocido'}\nPuerto local: ${PORT}\nCarpeta de datos: ${health.dataDirectory || dataDir()}\n\nPara compartir una ronda, usá el QR de la pantalla de publicación.`, buttons: ['Cerrar'] });
  } catch (error) {
    await dialog.showMessageBox(mainWindow!, { type: 'error', title: 'Diagnóstico técnico', message: 'La API local no responde.', detail: error instanceof Error ? error.message : String(error), buttons: ['Cerrar'] });
  }
}

app.on('ready', () => {
  app.setAppUserModelId('com.termometrodeequipo.desktop');
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Ayuda', submenu: [{ label: 'Buscar actualizaciones…', click: () => void checkForUpdates(mainWindow) }, { label: 'Diagnóstico técnico', click: () => void showDiagnostics() }, { type: 'separator' }, { role: 'about' }] }]));
  
  // IPC handler for network status check from renderer
  ipcMain.handle('get-network-status', async () => {
    return await getNetworkStatus();
  });
});
app.on('before-quit', () => { if (apiProcess && !apiProcess.killed) apiProcess.kill(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
