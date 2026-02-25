import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth';
import tenantPlugin from './plugins/tenant';
import errorHandlerPlugin from './plugins/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { agentsRoutes } from './modules/agents/agents.routes';
import { workflowsRoutes } from './modules/workflows/workflows.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { callsRoutes } from './modules/calls/calls.routes';
import { voiceRoutes } from './modules/voice/voice.routes';
import { sheetsRoutes } from './modules/sheets/sheets.routes';
import { env } from './config/env';

export async function buildApp() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = Fastify({
    logger: {
      level: 'info',
      ...(isProduction
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
            },
          }),
    },
  });

  // Plugins
  await app.register(cors, {
    origin: isProduction
      ? [
          'https://payhermes.com',
          'https://www.payhermes.com',
          'https://payhermes-app-production.up.railway.app',
          /\.railway\.app$/,
        ]
      : true,
    credentials: true,
  });
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(tenantPlugin);

  // Routes
  await app.register(authRoutes);
  await app.register(agentsRoutes);
  await app.register(workflowsRoutes);
  await app.register(dashboardRoutes);
  await app.register(callsRoutes);
  await app.register(voiceRoutes);
  await app.register(sheetsRoutes);

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
