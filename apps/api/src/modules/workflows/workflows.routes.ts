import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WorkflowsService } from './workflows.service';

export async function workflowsRoutes(fastify: FastifyInstance) {
  const service = new WorkflowsService();

  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get(
    '/api/agents/:agentId/workflows',
    async (request: FastifyRequest<{ Params: { agentId: string } }>, reply: FastifyReply) => {
      const workflows = await service.listByAgent(request, request.params.agentId);
      reply.send({ success: true, data: workflows });
    },
  );

  fastify.post(
    '/api/agents/:agentId/workflows',
    async (request: FastifyRequest<{ Params: { agentId: string } }>, reply: FastifyReply) => {
      const { name } = request.body as { name: string };
      const workflow = await service.create(request, request.params.agentId, name || 'Untitled Workflow');
      reply.status(201).send({ success: true, data: workflow });
    },
  );

  fastify.get(
    '/api/workflows/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const workflow = await service.getById(request, request.params.id);
      reply.send({ success: true, data: workflow });
    },
  );

  fastify.put(
    '/api/workflows/:id/graph',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const workflow = await service.updateGraph(request, request.params.id, request.body);
      reply.send({ success: true, data: workflow });
    },
  );

  fastify.post(
    '/api/workflows/:id/publish',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { status } = request.body as { status: 'SANDBOX' | 'PRODUCTION' };
      const workflow = await service.publish(request, request.params.id, status);
      reply.send({ success: true, data: workflow });
    },
  );

  fastify.post(
    '/api/workflows/:id/version',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const workflow = await service.createVersion(request, request.params.id);
      reply.status(201).send({ success: true, data: workflow });
    },
  );

  fastify.post(
    '/api/workflows/:id/validate',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const workflow = await service.getById(request, request.params.id);
      const result = service.validate(workflow.graph);
      reply.send({ success: true, data: result });
    },
  );
}
