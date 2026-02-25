import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createTenantClient } from '@voiceflow/db';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    db: ReturnType<typeof createTenantClient>;
  }
}

async function tenantPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('tenantId', '');
  fastify.decorateRequest('db', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    if (request.user?.tenantId) {
      request.tenantId = request.user.tenantId;
      request.db = createTenantClient(request.user.tenantId);
    }
  });
}

export default fp(tenantPlugin, {
  name: 'tenant',
  dependencies: ['auth'],
});
