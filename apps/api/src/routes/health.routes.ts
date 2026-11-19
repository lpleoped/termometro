import { Router } from 'express';
import { PRODUCT_NAME, type HealthResponse } from '@termometro/shared';
import { estadoMongo } from '../config/db';
import { laRedLocalEstaAbierta } from '../network/red-local';
import { dataDirectory, isLocalStorage } from '../storage/local-store';

const router = Router();

router.get('/health', (_req, res) => {
  const body: HealthResponse = {
    ok: true,
    service: '@termometro/api',
    product: PRODUCT_NAME,
    mongo: isLocalStorage() ? 'disconnected' : estadoMongo(),
    storage: isLocalStorage() ? 'json' : 'mongo',
    ...(isLocalStorage() ? { dataDirectory: dataDirectory() } : {}),
    networkListening: laRedLocalEstaAbierta() ? 'lan' : 'loopback',
  };
  res.json(body);
});

export default router;
