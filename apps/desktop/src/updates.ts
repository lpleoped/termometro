import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'node:fs';
import path from 'node:path';
import { runUpdateCheck } from './update-flow';
import { recoveryBackup } from './version-recovery';
let busy = false;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowDowngrade = false;
autoUpdater.on('error', error => console.error('Actualización:', error.message));

export async function checkForUpdates(window?: BrowserWindow) {
  if (busy) return;
  const show = (message: string) => dialog.showMessageBox({ type: 'info', title: 'Actualizaciones de Termómetro', message, buttons: ['Aceptar'] }).then(() => {});
  if (!app.isPackaged || !fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) {
    await show('Esta versión todavía no tiene un canal de actualizaciones publicado. Podés actualizar con el instalador de una versión posterior, sin desinstalar ni borrar tus datos.');
    return;
  }
  busy = true;
  try {
    await runUpdateCheck(autoUpdater, {
      askDownload: async version => (await dialog.showMessageBox({ type: 'question', title: 'Nueva versión disponible', message: 'Está disponible Termómetro ' + version, detail: 'Podés descargarla ahora y elegir cuándo reiniciar. No se reemplazan tus datos.', buttons: ['Descargar', 'Más tarde'], cancelId: 1 })).response === 0,
      askRestart: async () => (await dialog.showMessageBox({ type: 'question', title: 'Actualización descargada', message: '¿Cerrar Termómetro e instalar la actualización?', detail: 'Terminá de guardar lo que estés editando. Se conservará una copia de recuperación de tus datos.', buttons: ['Instalar y reiniciar', 'Más tarde'], cancelId: 1 })).response === 0,
      notify: show,
      beforeRestart: async () => { recoveryBackup(app.getPath('userData'), 'before-update'); window?.setProgressBar(-1); },
    });
  } catch {
    await show('No se pudo completar la actualización. La versión actual y tus datos siguen disponibles. Intentá nuevamente más tarde.');
  } finally { busy = false; window?.setProgressBar(-1); }
}
