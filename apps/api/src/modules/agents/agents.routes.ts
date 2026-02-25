import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { agentCreateSchema } from '@voiceflow/shared';
import { AgentsService } from './agents.service';

export async function agentsRoutes(fastify: FastifyInstance) {
  const service = new AgentsService();

  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const agents = await service.list(request);
    reply.send({ success: true, data: agents });
  });

  fastify.post('/api/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = agentCreateSchema.parse(request.body);
    const agent = await service.create(request, body);
    reply.status(201).send({ success: true, data: agent });
  });

  fastify.get(
    '/api/agents/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const agent = await service.getById(request, request.params.id);
      reply.send({ success: true, data: agent });
    },
  );

  fastify.patch(
    '/api/agents/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const agent = await service.update(request, request.params.id, request.body as any);
      reply.send({ success: true, data: agent });
    },
  );

  fastify.delete(
    '/api/agents/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await service.delete(request, request.params.id);
      reply.send({ success: true });
    },
  );
}
