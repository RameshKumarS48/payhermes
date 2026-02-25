import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { signupSchema, loginSchema } from '@voiceflow/shared';
import { AuthService } from './auth.service';
import { prisma } from '@voiceflow/db';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  fastify.post('/api/auth/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = signupSchema.parse(request.body);
    const tokens = await authService.signup(body);
    reply.status(201).send({ success: true, data: tokens });
  });

  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);
    reply.send({ success: true, data: result });
  });

  fastify.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.status(400).send({ success: false, error: 'refreshToken required' });
    }
    const tokens = await authService.refresh(refreshToken);
    reply.send({ success: true, data: tokens });
  });

  fastify.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.send({ success: true });
  });

  fastify.get(
    '/api/auth/me',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        include: { tenant: { select: { id: true, name: true, slug: true, plan: true } } },
      });
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }
      const { passwordHash, ...safe } = user;
      reply.send({ success: true, data: safe });
    },
  );
}
