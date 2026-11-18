import { Router, Request, Response } from 'express';
import os from 'node:os';
import { exec } from 'node:child_process';
import http from 'node:http';
import { classifyNetworkCategory, selectLanAddress, type NetworkProfileType } from '../services/lan-hosts';

const router = Router();

interface NetworkStatus {
  profileType: NetworkProfileType;
  lanHealthy: boolean;
  lanAddress: string | null;
  isDesktop: boolean;
}

function getLanAddress(): string | null {
  return selectLanAddress(os.networkInterfaces());
}

async function getNetworkProfile(): Promise<NetworkProfileType> {
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
        resolve(classifyNetworkCategory(stdout));
      }
    );
  });
}

async function checkLanHealth(): Promise<boolean> {
  const lanAddress = getLanAddress();
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

router.get('/network-status', async (_req: Request, res: Response) => {
  // Only available in desktop mode
  if (process.env.TERMOMETRO_DESKTOP !== 'true') {
    return res.status(404).json({ error: 'Not available in this mode' });
  }
  
  try {
    const [profileType, lanHealthy] = await Promise.all([
      getNetworkProfile(),
      checkLanHealth()
    ]);
    
    const status: NetworkStatus = {
      profileType,
      lanHealthy,
      lanAddress: getLanAddress(),
      isDesktop: true,
    };
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get network status' });
  }
});

export default router;
