/** UI-independent orchestration; no downloads/install without a user choice. */
export interface UpdateClient {
  checkForUpdates(): Promise<{ isUpdateAvailable: boolean; updateInfo: { version: string } } | null>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
}
export interface UpdateUI {
  askDownload(version: string): Promise<boolean>;
  askRestart(): Promise<boolean>;
  notify(message: string): Promise<void>;
  beforeRestart(): Promise<void>;
}
export async function runUpdateCheck(client: UpdateClient, ui: UpdateUI) {
  const result = await client.checkForUpdates();
  if (!result?.isUpdateAvailable) { await ui.notify('Ya tenés la última versión publicada.'); return; }
  if (!await ui.askDownload(result.updateInfo.version)) return;
  await client.downloadUpdate();
  if (!await ui.askRestart()) { await ui.notify('La descarga quedó lista. Podés retomar la actualización desde Ayuda.'); return; }
  await ui.beforeRestart();
  client.quitAndInstall(false, true);
}
