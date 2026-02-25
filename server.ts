/**
 * Unified production server for Railway.
 * Runs Fastify API on /api/* and serves Next.js for everything else.
 * Single port, single process.
 */

import { buildApp } from './apps/api/src/app';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = parseInt(process.env.PORT || '8080', 10);
const NEXT_PORT = 3000;

async function findNextServer(): Promise<string | null> {
  // Try multiple possible paths for the standalone server
  const candidates = [
    path.resolve('apps/web/.next/standalone/apps/web/server.js'),
    path.resolve('apps/web/.next/standalone/server.js'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function startNextServer(): Promise<ChildProcess> {
  const standalonePath = await findNextServer();
  if (!standalonePath) {
    throw new Error('Next.js standalone server not found');
  }

  console.log(`Starting Next.js from: ${standalonePath}`);

  const child = spawn('node', [standalonePath], {
    env: {
      ...process.env,
      PORT: String(NEXT_PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
    cwd: path.dirname(standalonePath),
  });

  child.on('error', (err) => {
    console.error('Next.js process error:', err);
  });

  // Wait for Next.js to be ready (up to 30s)
  await new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 150;
    const check = () => {
      attempts++;
      if (attempts > maxAttempts) {
        reject(new Error('Next.js failed to start within 30s'));
        return;
      }
      const req = http.get(`http://127.0.0.1:${NEXT_PORT}/`, (res) => {
        resolve();
      });
      req.on('error', () => {
        setTimeout(check, 200);
      });
    };
    setTimeout(check, 1000);
  });

  console.log(`Next.js server ready on internal port ${NEXT_PORT}`);
  return child;
}

let nextReady = false;

async function main() {
  // Start Fastify API
  const app = await buildApp();

  // Proxy all non-API requests to Next.js
  app.setNotFoundHandler(async (request, reply) => {
    if (!nextReady) {
      reply.status(503).send({
        error: 'Application starting...',
        message: 'The frontend is still loading. Please try again in a few seconds.',
      });
      return;
    }

    // Proxy to Next.js
    const targetUrl = `http://127.0.0.1:${NEXT_PORT}${request.url}`;

    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers[key] = Array.isArray(value) ? value[0] : value;
      }
      headers['host'] = `127.0.0.1:${NEXT_PORT}`;
      delete headers['connection'];
      delete headers['transfer-encoding'];

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method)
          ? undefined
          : request.body
            ? JSON.stringify(request.body)
            : undefined,
        redirect: 'manual',
      });

      // Forward status
      reply.status(response.status);

      // Forward relevant headers
      const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive']);
      response.headers.forEach((value, key) => {
        if (!skipHeaders.has(key.toLowerCase())) {
          reply.header(key, value);
        }
      });

      const body = Buffer.from(await response.arrayBuffer());
      reply.send(body);
    } catch (error) {
      console.error('Next.js proxy error:', error);
      reply.status(502).send({ error: 'Frontend proxy error' });
    }
  });

  // Start Fastify on the main port first (so Railway sees port binding)
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`=================================`);
    console.log(`VoiceFlow server on port ${PORT}`);
    console.log(`API:  /api/*`);
    console.log(`=================================`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Start Next.js in background after API is ready
  try {
    await startNextServer();
    nextReady = true;
    console.log(`Web:  /* (proxied to Next.js)`);
    console.log(`=================================`);
  } catch (err) {
    console.error('Failed to start Next.js:', err);
    console.log('Running API-only mode. Frontend unavailable.');
  }

  // Cleanup on exit
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    app.close();
    process.exit(0);
  });
}

main();
