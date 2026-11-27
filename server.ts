import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './server/apiRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// Simple sliding-window rate limiter per IP for /api/*
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQ = 45;

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_REQ) {
    res.status(429).json({
      error: 'Rate limit exceeded. Please pause briefly before sending another AI request.',
    });
    return;
  }
  timestamps.push(now);
  rateBuckets.set(ip, timestamps);
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));
  app.use('/api', rateLimiter);

  app.all('/api/*', async (req, res) => {
    try {
      const result = await handleApiRequest(req.method, req.originalUrl, req.body);
      res.status(result.status).json(result.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      res.status(500).json({ error: message });
    }
  });

  // Return JSON errors for malformed JSON / oversized payloads on /api/*
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      const message = err instanceof Error ? err.message : 'Invalid request payload.';
      res.status(400).json({ error: message });
      return;
    }
    next(err);
  });

  // Vite middleware in dev, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (!fs.existsSync(indexPath)) {
        res.status(503).send('Application build not found. Run "npm run build" before starting in production.');
        return;
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MATHMIND AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
