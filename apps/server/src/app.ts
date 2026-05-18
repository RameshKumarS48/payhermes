import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { voiceRoutes } from './routes/voice'
import { env } from './config/env'

export async function buildApp() {
  const isDev = process.env['NODE_ENV'] !== 'production'
  const app = Fastify({
    logger: isDev
      ? {
          level: 'info',
          transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } },
        }
      : { level: 'info' },
  })

  await app.register(cors, {
    origin: process.env['NODE_ENV'] === 'production' ? [env.WEB_ORIGIN] : true,
    credentials: true,
  })

  await app.register(websocket)

  await app.register(voiceRoutes)

  app.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  return app
}
