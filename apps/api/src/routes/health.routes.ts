import { Router } from 'express';
import { PRODUCT_NAME, type HealthResponse } from '@termometro/shared';
import { estadoMongo } from '../config/db';

const router = Router();

router.get('/health', (_req, res) => {
  const body: HealthResponse = {
    ok: true,
    service: '@termometro/api',
    product: PRODUCT_NAME,
    mongo: estadoMongo(),
  };
  res.json(body);
});

export default router;
