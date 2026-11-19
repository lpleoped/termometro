import { Router, Request, Response } from 'express';
import { exec } from 'node:child_process';
import http from 'node:http';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware';
import { abrirRedLocal, direccionesParaCompartir } from '../network/red-local';
import { registrarError } from '../observability/errores';

const router = Router();

interface NetworkStatus {
  profileType: 'Private' | 'Public' | 'Domain' | 'Unknown';
  lanHealthy: boolean;
  lanAddress: string | null;
  isDesktop: boolean;
}

async function getLanAddress(): Promise<string | null> {
  const [preferida] = await direccionesParaCompartir();
  return preferida?.address ?? null;
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
        if (category === 'Public' || category === '0') resolve('Public');
        else if (category === 'Private' || category === '1') resolve('Private');
        else if (category === 'Domain' || category === '2') resolve('Domain');
        else resolve('Unknown');
      }
    );
  });
}

async function checkLanHealth(lanAddress: string | null): Promise<boolean> {
  if (!lanAddress) return false;
  
  const port = Number(process.env.PORT) || 3000;
  
  return new Promise((resolve) => {
    const request = http.get(`http://${lanAddress}:${port}/api/health`, { timeout: 3000 }, (response) => {
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

router.post('/red-local', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const addresses = await abrirRedLocal(req.app);
    res.json({ listening: 'lan', addresses });
  } catch (error) {
    registrarError('red', error, { accion: 'abrir' });
    res.status(400).json({ error: error instanceof Error ? error.message : 'No se pudo abrir la encuesta en la red local.' });
  }
});

router.get('/network-status', async (_req: Request, res: Response) => {
  // Only available in desktop mode
  if (process.env.TERMOMETRO_DESKTOP !== 'true') {
    return res.status(404).json({ error: 'Not available in this mode' });
  }
  
  try {
    const lanAddress = await getLanAddress();
    const [profileType, lanHealthy] = await Promise.all([
      getNetworkProfile(),
      checkLanHealth(lanAddress),
    ]);
    
    const status: NetworkStatus = {
      profileType: profileType as NetworkStatus['profileType'],
      lanHealthy,
      lanAddress,
      isDesktop: true,
    };
    
    res.json(status);
  } catch (error) {
    registrarError('red', error, { accion: 'estado' });
    res.status(500).json({ error: 'Failed to get network status' });
  }
});

export default router;
